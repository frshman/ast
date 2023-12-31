const fs = require("fs")

const ast_module_header = fs.readFileSync(`${__dirname}/plugins/ast_module_head.js`)
const startTime = `console.time("处理完毕，耗时");`
const functiondeal = fs.readFileSync(`${__dirname}/plugins/datadome_plugin.js`)
//预处理通用模板
const pre_code = fs.readFileSync(`${__dirname}/main.js`)
const astCode = pre_code + functiondeal 

const writeCode = `console.timeEnd("处理完毕，耗时");

let {code} = generator(ast,opts = {
	"compact": false,  // 是否压缩代码
	"comments": false,  // 是否保留注释
	"jsescOption": { "minimal": true },  //Unicode转义
});

fs.writeFile(decode_file, code, (err) => {
});`

const code = startTime + "\n" + ast_module_header + "\n" + astCode + "\n" + writeCode
eval(code)

