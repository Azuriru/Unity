module.exports = {
    plugins: [
        require('autoprefixer'),
        require('postcss-selector-matches')({
            lineBreak: true
        }),
        // require('@csstools/postcss-sass')
    ]
};