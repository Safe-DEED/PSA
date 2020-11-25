module.exports = {
    "plugins": ["@babel/plugin-transform-modules-commonjs", "add-module-exports"],
    "presets": [
      [
          '@babel/preset-env',
          {
              targets: {
                node: 'current'
              },
          },
      ],
  ],
};
