// Minimal typings for the parts of the `qrcode` package the app uses.
// (@types/qrcode pulls in Node.js typings, which change browser timer types app-wide.)
declare module 'qrcode' {
  interface QRCodeToDataURLOptions {
    width?: number;
    margin?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }

  const QRCode: {
    toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;
  };

  export default QRCode;
}
