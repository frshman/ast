const fs = require('fs')
const parser = require("@babel/parser")
const traverse = require("@babel/traverse").default
const t = require("@babel/types")
const { types } = require('@babel/core')
const generator = require("@babel/generator").default


/*
const jscode = fs.readFileSync(`homeword/demo.js`, {
    encoding: "utf-8"
})
*/
let jscode = `function _u() {
    var  n = r(v(980, 817));
   return (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = (n = n["replace"](/px_width/g, qu))["replace"](/px_cnt_width/g, hu))["replace"](/px_height/g, Iu))["replace"](/px_background/g, su))["replace"](/pxcntId/g, Uc))["replace"](/pxcId/g, Mc))["replace"](/pxdc/g, Bc))["replace"](/pxcd/g, Hc))["replace"](/pxcac/g, Ec))["replace"](/pxifc/g, Rc))["replace"](/pxbbwof/g, Uu))["replace"](/pxba/g, Zc))["replace"](/pxtc/g, jc))["replace"](/px_bar_height/g, wu))["replace"](/pxtId/g, bc))["replace"](/pxbtnwarpper/g, xc))["replace"](/px_border_width/g, tu))["replace"](/px_border_color/g, vu))["replace"](/px_border_radius/g, cu))["replace"](/px_fill_color/g, uu))["replace"](/px_text_color/g, iu))["replace"](/px_text_size/g, fu))["replace"](/px_text_font/g, ou))["replace"](/px_inner_height/g, eu))["replace"](/px_target_color/g, Cu))["replace"](/px_font_weight/g, zu))["replace"](/px_btn_padding/g, Lu))["replace"](/px_pressable_area_padding/g, ku))["replace"](/px_pressable_area_width/g, lu))["replace"](/px_pressable_area_top/g, du))["replace"](/px_text_transform/g, yu))["replace"](/px_checkmark_thickness/g, Du))["replace"](/px_checkmark_height/g, au))["replace"](/px_checkmark_width/g, Au))["replace"](/px_acc_text/g, Wc))["replace"](/px_acc_email_input/g, Tc))["replace"](/px_acc_value_box/g, Yc))["replace"](/px_acc_value_hyphen/g, Nc))["replace"](/px_acc_step_two_continue_btn/g, Jc))["replace"](/px_value_box_container/g, pc))["replace"](/px_acc_img/g, _c))["replace"](/px_acc_tooltip/g, Fc))["replace"](/pxvisuallyhidden/g, ru);
 }`

 let ast = parser.parse(jscode);
 let lst = [];
 const visitor = {
     AssignmentExpression:{
         exit(path){
             let {left, right, operator} = path.node;
             if(types.isIdentifier(left) && types.isCallExpression(right) && operator=='='){
                 // 拿到嵌套赋值的语句，只留下最后一个需要return语句
                 lst.push(path.node);
                 path.replaceInline(left);
             }
         }
     }
 };
 traverse(ast, visitor);
 
 
 const visitor_1 = {
     // 在return语句之前插入赋值语句
     ReturnStatement(path){
         for(let i of lst){
             path.insertBefore(i);
         }
     }
 }
 traverse(ast, visitor_1);


// 生成最后的代码
let code = generator(ast).code

console.log(code)
// fs.writeFile(`./homeword10_result.js`, code, (err)=>{})

