export default {
  presets: [
    [
      '@babel/preset-env',
      {
        debug: true,
        targets: {
          node: 'current',
          browsers: ['> 1%', 'last 2 versions', 'not dead', 'ie >= 11']
        },
        modules: false,
        useBuiltIns: 'usage',
        corejs: 3
      }
    ]
  ],
  plugins: [
    '@babel/plugin-transform-runtime'
  ],
  env: {
    test: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current'
            },
            useBuiltIns: 'usage',
            corejs: 3
          }
        ]
      ]
    },
    client: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              browsers: ['> 1%', 'last 2 versions', 'ie >= 11']
            },
            modules: false,
            useBuiltIns: 'usage',
            corejs: 3
          }
        ]
      ],
      plugins: []
    },
    production: {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              browsers: ['> 1%', 'last 2 versions', 'ie >= 11']
            },
            modules: false,
            useBuiltIns: 'usage',
            corejs: 3
          }
        ]
      ]
    }
  }
};

