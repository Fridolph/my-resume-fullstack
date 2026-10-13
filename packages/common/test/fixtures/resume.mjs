export function resumeFixture() {
  const palette = {
    primary: '#2563eb',
    gradientFrom: '#2563eb',
    gradientTo: '#38bdf8',
    surface: '#ffffff',
    text: '#172554',
    muted: '#64748b',
    border: '#dbeafe',
    chipBg: '#eff6ff',
    chipText: '#1d4ed8',
  }
  return {
    schemaVersion: 1,
    content: {
      sections: [
        {
          id: 'profile',
          type: 'profile',
          title: '基本信息',
          data: {
            name: '测试求职者',
            headline: '通用职业',
            summary: '',
            hero: { frontImageUrl: '', backImageUrl: '', linkUrl: '', slogans: [] },
            infoItems: [],
            links: [],
            interests: [],
            stats: [],
            gallery: [],
          },
        },
        {
          id: 'ability',
          type: 'capabilities',
          title: '个人能力',
          data: {
            groups: [
              {
                id: 'group',
                title: '客户服务',
                items: [{ id: 'item', name: '沟通', description: '实践说明', evidenceLinks: [] }],
              },
            ],
            ratingScale: { min: 0, max: 5, basis: '个人自评' },
            dimensions: [{ id: 'dimension', label: '沟通', groupId: 'group', score: null }],
          },
        },
      ],
      footer: { note: '独立页尾' },
    },
    display: {
      brand: {},
      layout: { mode: 'single', splitSide: 'left', stickySide: false, sideWidth: 'compact' },
      sections: {
        order: ['profile', 'ability'],
        hidden: [],
        slot: {},
        overrides: { ability: { capabilities: { view: 'bar', dimensionIds: ['dimension'], previewItemCount: 3 } } },
      },
      options: {
        showPhone: true,
        showEmail: true,
        showLocation: true,
        showYears: true,
        showTechStack: true,
        showAchievements: true,
      },
      theme: { id: 'test', label: '测试配色', mode: 'light', light: { ...palette }, dark: { ...palette } },
      background: { type: 'plain', textureId: 'none', image: { url: '', fit: 'cover', overlay: 0, blur: 0 } },
      style: { id: 'minimal' },
    },
  }
}
