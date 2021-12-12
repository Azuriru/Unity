const env = Object.assign({}, process.env);

for (const key in env) {
    const value = env[key];
    if (
        typeof value == 'string' &&
        (value.charAt(0) == '{' || value.charAt(0) == '[')
    ) {
        try {
            env[key] = JSON.parse(value);
        } catch(e) {}
    }
}

try {
    const config = require('../../config.json');
    module.exports = {
        ...env,
        ...config
    };
} catch(e) {
    module.exports = env;
}
