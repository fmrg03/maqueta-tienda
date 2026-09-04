module.exports = {
  rootDir: 'src',
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
    // sanitize-html depende de htmlparser2@12+, que es ESM-only ("type":
    // "module"). Las opciones de babel se pasan directo acá (no vía
    // babel.config.js) porque con rootDir: 'src', babel-jest busca la
    // config desde 'src/', nunca encuentra un babel.config.js en la raíz
    // del proyecto — perdí un buen rato de diagnóstico en esto.
    '^.+\\.js$': [
      'babel-jest',
      { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!.*(htmlparser2|domhandler|domutils|domelementtype|dom-serializer|entities))',
  ],
};
