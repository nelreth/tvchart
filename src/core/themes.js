const themes = {
  light: {
    background: '#ffffff',
    textColor: '#1e2026',
    // gridColor: '#e2e4e9',
    gridColor: '#ffffff',
    borderColor: '#e2e4e9',
    crosshairColor: '#6930C3',
    watermarkColor: 'rgba(202, 202, 202, 0.3)',
    paneSeparatorColor: '#f22c3d',
    paneSeparatorHoverColor: 'rgba(255, 0, 0, 0.1)',
    drawingLineColor: '#FFD700',
    legendBg: 'rgba(255, 255, 255, 0.8)',
    legendText: '#7b7c80',
    adrPositiveColor: '#d30000',
    chartErrorColor: '#ef5350',
    drawingHintBg: 'rgba(0, 0, 0, 0.65)',
    drawingHintText: '#ffffff',

    tickerItemColor: '#1e2026',

    mainSeries: {
      upColor: '#d0d4dc',
      downColor: '#668797',
      borderUpColor: '#000000',
      borderDownColor: '#000000',
      wickUpColor: '#000000',
      wickDownColor: '#000000',
    },

    ma10Series: {
      color: '#228B22',
      lineWidth: 1,
    },
    ma20Series: {
      color: '#D30000',
      lineWidth: 1,
    },
    ma50Series: {
      color: '#A9AAA8',
      lineWidth: 1,
    },
  },

  dark: {
    background: 'rgb(0,37,64)',
    textColor: 'rgb(112,128,150)',
    gridColor: '#2a2a4e',
    borderColor: '#2a2a4e',
    crosshairColor: '#f22c3d',
    watermarkColor: 'rgba(50,120,163, 0.2)',
    paneSeparatorColor: 'rgb(50,120,163)',
    paneSeparatorHoverColor: 'rgba(255, 0, 0, 0.1)',
    drawingLineColor: '#FFD700',
    legendBg: 'rgba(22, 24, 34, 0.82)',
    legendText: '#d1d4dc',
    adrPositiveColor: '#ff6b6b',
    chartErrorColor: '#ef5350',
    drawingHintBg: 'rgba(0, 0, 0, 0.65)',
    drawingHintText: '#ffffff',

    tickerItemColor: 'rgb(112,128,150)',

    mainSeries: {
      upColor: 'rgb(60,215,130)',
      downColor: 'rgb(254,92,92)',
      borderUpColor: 'rgb(60,215,130)',
      borderDownColor: 'rgb(254,92,92)',
      wickUpColor: 'rgb(60,215,130)',
      wickDownColor: 'rgb(254,92,92)',
    },

    ma10Series: {
      color: '#228B22',
      lineWidth: 1,
    },
    ma20Series: {
      color: '#D30000',
      lineWidth: 1,
    },
    ma50Series: {
      color: '#A9AAA8',
      lineWidth: 1,
    },
  },
  // dark: {
  //   background: '#1a1a2e',
  //   textColor: '#d1d4dc',
  //   gridColor: '#2a2a4e',
  //   borderColor: '#2a2a4e',
  //   crosshairColor: '#9B7DFF',
  //   watermarkColor: 'rgba(155, 125, 255, 0.3)',
  //   paneSeparatorColor: '#f22c3d',
  //   paneSeparatorHoverColor: 'rgba(255, 0, 0, 0.1)',
  //   drawingLineColor: '#FFD700',
  //   legendBg: 'rgba(22, 24, 34, 0.82)',
  //   legendText: '#d1d4dc',
  //   adrPositiveColor: '#ff6b6b',
  //   chartErrorColor: '#ef5350',
  //   drawingHintBg: 'rgba(0, 0, 0, 0.65)',
  //   drawingHintText: '#ffffff',

  //   mainSeries: {
  //     upColor: '#ffffff',
  //     downColor: '#787B86',
  //     borderUpColor: '#B2B4C6',
  //     borderDownColor: '#B2B4C6',
  //     wickUpColor: '#B2B4C6',
  //     wickDownColor: '#B2B4C6',
  //   },

  //   ma10Series: {
  //     color: '#228B22',
  //     lineWidth: 1,
  //   },
  //   ma20Series: {
  //     color: '#D30000',
  //     lineWidth: 1,
  //   },
  //   ma50Series: {
  //     color: '#A9AAA8',
  //     lineWidth: 1,
  //   },
  // },
}

export function getTheme(themeName = 'dark') {
  return themes[themeName] || themes.dark
}

export default themes