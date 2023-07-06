const fs = require("fs")

const ast_module_header = fs.readFileSync(`${__dirname}/plugins/ast_module_head.js`)
const startTime = `console.time("处理完毕，耗时");`
const sanyuan_if = fs.readFileSync(`${__dirname}/plugins/sanyuan-if.js`)
const iftoswitch = fs.readFileSync(`${__dirname}/plugins/iftoswitch.js`)
const astCode = sanyuan_if + "\n" + iftoswitch
const writeCode = `console.timeEnd("处理完毕，耗时");

let {code} = generator(ast, opts = {jsescOption: {"minimal": true}});

fs.writeFile(decode_file, code, (err) => {
});`

const code = startTime + "\n" + ast_module_header + "\n" + astCode + "\n" + writeCode
eval(code)