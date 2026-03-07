const { withPodfile } = require('@expo/config-plugins');
const { mergeContents } = require('@expo/config-plugins/build/utils/generateCode');

/**
 * Adds the NPM-vendored simdjson pod required by WatermelonDB.
 * CocoaPods trunk doesn't have simdjson, so we use the local @nozbe/simdjson.
 */
function withWatermelonDBSimdjson(config) {
  return withPodfile(config, (config) => {
    const tag = 'watermelondb-simdjson';
    const podBlock = `# WatermelonDB: NPM-vendored simdjson (CocoaPods trunk doesn't have it)
pod 'simdjson', :path => '../node_modules/@nozbe/simdjson', :modular_headers => true

`;

    const result = mergeContents({
      tag,
      src: config.modResults.contents,
      newSrc: podBlock,
      anchor: /prepare_react_native_project!/,
      offset: 1,
      comment: '#',
    });

    if (result.didMerge) {
      config.modResults.contents = result.contents;
    }
    return config;
  });
}

module.exports = withWatermelonDBSimdjson;
