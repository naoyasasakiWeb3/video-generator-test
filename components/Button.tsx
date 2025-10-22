
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

const Button: React.FC<ButtonProps> = ({ children, className, variant = 'primary', ...props }) => {
  const baseClasses = 'px-6 py-3 font-semibold rounded-md shadow-lg transform transition-transform duration-150 focus:outline-none focus:ring-4';
  
  const variantClasses = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 focus:ring-indigo-400 disabled:bg-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed',
    secondary: 'bg-gray-700 text-white hover:bg-gray-600 active:scale-95 focus:ring-gray-500 disabled:bg-gray-800 disabled:cursor-not-allowed'
  };

  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default Button;
