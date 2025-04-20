/// <reference types="react" />
/// <reference types="next" />

declare module '@heroicons/react/24/outline';

import { FormEvent, ChangeEvent } from 'react';
import { MetaMaskInpageProvider } from '@metamask/providers';

declare global {
  interface Window {
    ethereum?: MetaMaskInpageProvider;
  }
}

declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

export type { FormEvent, ChangeEvent }; 