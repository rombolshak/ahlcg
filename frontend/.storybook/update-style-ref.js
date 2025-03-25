var fs = require("fs");
var files = fs.readdirSync(__dirname + "/../dist/ahlcg/browser");
var styles = files
  .filter((f) => f.indexOf(".css") !== -1)
  .map((f) => `dist/ahlcg/browser/${f}`);
console.log(styles);

var json = require(__dirname + "/../angular.json");
json.projects.ahlcg.architect.storybook.options.styles = styles;
json.projects.ahlcg.architect["build-storybook"].options.styles = styles;

fs.writeFileSync(__dirname + "/../angular.json", JSON.stringify(json, null, 2));
