import pkg from '../package.json' with { type: 'json' };

const { name, version, copyright } = pkg;
export default { name, version, copyright };
