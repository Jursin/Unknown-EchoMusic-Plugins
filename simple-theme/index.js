const TOKENS = {
  light: {
    shell: '#f0f0f3',
    main: '#ffffff',
    card: '#f5f5f7',
    elevated: '#ffffff',
    text: '#1d1d1f',
    secondary: '#555963',
    border: '#dedee5',
  },
  dark: {
    shell: '#202024',
    main: '#26262a',
    card: '#36363a',
    elevated: '#36363a',
    text: '#f5f5f7',
    secondary: '#b8bfcb',
    border: '#48484e',
  },
}

/** 改版前内置的主题色预设 */
const PRESETS = [
  { id: 'echo-blue', name: '默认蓝', color: '#0071e3' },
  { id: 'echo-crimson', name: '赤焰红', color: '#ef4444' },
  { id: 'echo-rose', name: '玫瑰粉', color: '#ec4899' },
  { id: 'echo-purple', name: '暮色紫', color: '#8b5cf6' },
  { id: 'echo-indigo', name: '靛青', color: '#6366f1' },
  { id: 'echo-sky', name: '天蓝', color: '#0ea5e9' },
  { id: 'echo-teal', name: '薄荷', color: '#14b8a6' },
  { id: 'echo-forest', name: '森绿', color: '#22c55e' },
  { id: 'echo-amber', name: '琥珀', color: '#f59e0b' },
  { id: 'echo-orange', name: '落日橙', color: '#f97316' },
]

export function activate(ctx) {
  for (const preset of PRESETS) {
    ctx.theme.register({
      id: preset.id,
      title: `${preset.name}`,
      type: 'default',
      defaultMode: 'system',
      description: `改版前的 ${preset.name} 主题色。`,
      variants: {
        light: { accent: preset.color, tokens: TOKENS.light },
        dark: { accent: preset.color, tokens: TOKENS.dark },
      },
    })
  }
}
