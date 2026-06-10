const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.watchFolders = [];
config.resolver.blacklistRE = /node_modules\/.*\/node_modules/;
module.exports = config;
