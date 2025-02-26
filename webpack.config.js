//@ts-check

'use strict';

const path = require('path');

/**@type {import('webpack').Configuration}*/
const config = {
    target: 'node', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
    entry: './src/extension.ts', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
    output: {
        // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
        path: path.resolve(__dirname, 'dist'),
        filename: 'extension.js',
        libraryTarget: 'commonjs2',
        // devtoolModuleFilenameTemplate: '../[resource-path]',
    },
    devtool: false,
    externals: {
        vscode: 'commonjs vscode',
        'puppeteer-real-browser': 'commonjs puppeteer-real-browser'
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: [/node_modules/, /src\/webview\/frontend/],
                use: [
                    {
                        loader: 'ts-loader',
                    },
                ],
            },
        ],
    },
};
module.exports = config;
