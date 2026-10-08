export const designConsole = {
  info: (message: string) => {
    console.log(`%c[DesignPlugin:] ${message}`, 'background:#2c7fff;color:white;border-radius:2px;line-height:1.5;')
  },
  error: (message: string) => {
    console.log(`%c[DesignPlugin:] ${message}`, 'background:#fb2c37;color:white;border-radius:2px;line-height:1.5;')
  },
  warn: (message: string) => {
    console.log(`%c[DesignPlugin:] ${message}`, 'background:#f0b000;color:white;border-radius:2px;line-height:1.5;')
  },
  success: (message: string) => {
    console.log(`%c[DesignPlugin:] ${message}`, 'background:#00c16a;color:white;border-radius:2px;line-height:1.5;')
  },
}
