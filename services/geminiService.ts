import { GoogleGenAI, Type } from "@google/genai";
import { Trend, StoryPrompts } from '../types';

const VEO_MODEL = 'veo-3.1-fast-generate-preview';
const PROMPT_MODEL = 'gemini-2.5-flash';

export const generateStoryPrompts = async (trend: Trend): Promise<StoryPrompts> => {
  if (!process.env.API_KEY) {
    throw new Error("API key not found. Please select an API key.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `日本の「頑固おやじ」と現在のTwitterトレンド「${trend.name}」を組み合わせた、面白いショート動画のアイデアを考えてください。物語の構成は日本の伝統的な「起承転結」に従ってください。各パート（起、承、転、結）について、VeoのようなAI動画生成モデルで使える、短く、視覚的に訴えるプロンプトを1つずつ作成してください。
  
  出力は必ず以下のJSON形式にしてください:
  {
    "ki": "（起のプロンプト）",
    "sho": "（承のプロンプト）",
    "ten": "（転のプロンプト）",
    "ketsu": "（結のプロンプト）"
  }`;

  try {
    const response = await ai.models.generateContent({
      model: PROMPT_MODEL,
      contents: prompt,
      config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: {
                  ki: { type: Type.STRING, description: "物語の始まり（起）のプロンプト" },
                  sho: { type: Type.STRING, description: "物語の展開（承）のプロンプト" },
                  ten: { type: Type.STRING, description: "物語の転換点（転）のプロンプト" },
                  ketsu: { type: Type.STRING, description: "物語の結論（結）のプロンプト" },
              },
              required: ["ki", "sho", "ten", "ketsu"],
          },
      },
    });
    
    return JSON.parse(response.text) as StoryPrompts;

  } catch (error) {
    console.error("Error generating story prompts:", error);
    throw new Error("Failed to generate story prompts. Please check the console for details.");
  }
};


export async function* generateVideo(prompt: string): AsyncGenerator<{ status: string; videoUrl?: string }> {
  if (!process.env.API_KEY) {
    throw new Error("API key not found. Please select an API key before generating a video.");
  }
  
  // Re-initialize AI client to ensure it uses the latest selected key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    yield { status: "Starting video generation with Veo..." };
    let operation = await ai.models.generateVideos({
      model: VEO_MODEL,
      prompt: prompt,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    const reassuringMessages = [
        "Warming up the pixels...",
        "Composing a visual masterpiece...",
        "Teaching the AI about cinematography...",
        "Rendering frame by frame...",
        "This is taking a moment, but it'll be worth it!",
        "Almost there, adding the final touches..."
    ];
    let messageIndex = 0;

    while (!operation.done) {
      yield { status: reassuringMessages[messageIndex % reassuringMessages.length] };
      messageIndex++;
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    if(operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error("Video generation completed, but no download link was found.");
    }

    yield { status: "Video generated! Downloading..." };
    
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) {
        throw new Error(`Failed to download video. Status: ${response.statusText}`);
    }

    const videoBlob = await response.blob();
    const videoUrl = URL.createObjectURL(videoBlob);
    
    yield { status: "Done!", videoUrl: videoUrl };

  } catch (error) {
    console.error("Error during video generation:", error);
    if (error instanceof Error && error.message.includes("Requested entity was not found")) {
         throw new Error("API key not valid. Please select a new key.");
    }
    throw new Error(`Failed to generate video. ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
