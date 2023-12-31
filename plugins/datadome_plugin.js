
//����ֵ����
const calcCallValue =
{   
	FunctionDeclaration(path) {
		let { scope, node } = path;
		let { id, params, body } = node;
		
        //����i��window���� return ����û�в��� return ���û�з���ֵ return
		if (id.name != "i" || params.length == 0 || !types.isReturnStatement(body.body[body.body.length - 1])) {
			return;
		}
        
		let funcNames = [id.name];
		let decodeCode = path.toString();
        
		let allNextSiblings = path.getAllNextSiblings();
        
		for (let nextSibling of allNextSiblings) {
			if (!nextSibling.isFunctionDeclaration()) {
				break;
			}
			funcNames.push(nextSibling.node.id.name);
			decodeCode += nextSibling.toString();
		}

		if (funcNames.length == 1) return;
        
		eval(decodeCode);

		for (let funcName of funcNames) {
			let binding = scope.getBinding(funcName);
            
			if (!binding || !binding.constant) {
				continue;
			}
            
			for (let referPath of binding.referencePaths) {
				let { parentPath, node } = referPath;
                //ͨ���������õĸ��ڵ�  ���ú���
				if (!parentPath.isCallExpression({ "callee": node })) {
					continue;
				}
                
				let { arguments } = parentPath.node;

				if (arguments.length == 0 || !isNodeLiteral(arguments)) {
					continue;
				}
                
				let value = eval(parentPath.toString());
				console.log(parentPath.toString(), "--->", value);
				parentPath.replaceWith(types.valueToNode(value));
			}
		}

	}
}

//�����۵�
const constantFold = {
    
    "Identifier|BinaryExpression|UnaryExpression|CallExpression"(path) {
        if (path.isUnaryExpression({ operator: "-" }) ||
            path.isUnaryExpression({ operator: "void" })) {
            return;
        }
            
        let { confident, value } = path.evaluate();

        if (!confident) return; //�޷�����������ֱ�ӷ���

        let valueType = typeof value;

        if (!["number", "string", "boolean"].includes(valueType)) {
            return;
        }
        if (valueType == 'number' && (!Number.isFinite(value))) { //���˵� 1/0 �������������ᵼ�¶�ջ�����
            return;
        }

        path.replaceWith(types.valueToNode(value))

    }
}

//��ε��� ��ԭ������
for(let i=0; i<5; i++)
{
	traverse(ast, calcCallValue);

	traverse(ast, constantFold);
}

//calc(p?33:34) --> p?cal(33):calc(34)
const changeCallToConditionalExpression = 
{
	CallExpression(path)
	{
		let {callee,arguments} = path.node;
		
		if (arguments.length != 1 || !types.isConditionalExpression(arguments[0]))
		{
			return;
		}
		
		let {test,consequent,alternate} = arguments[0];
		
		let newConsequent = types.callExpression(callee,[consequent]);
		let newAlternate  = types.callExpression(callee,[alternate]);
		
		let newConditionalNode = types.ConditionalExpression(test,newConsequent,newAlternate);

		path.replaceWith(newConditionalNode);
		
	}
}

traverse(ast, changeCallToConditionalExpression);

ast = parse(generator(ast).code);

//ר�Ŵ���ln���� �ؼ�������wn����ȡֵ
const getObCode = 
{
	VariableDeclarator(path)
	{	
		let {parentPath,scope,node} = path;
		
		let {id,init} = node;

		if (!types.isArrayExpression(init) || init.elements.length == 0 ||
			!init.elements.every(element => types.isLiteral(element))) {
			return;
		}

		let binding = scope.getBinding(id.name);

		if (!binding || !binding.constant || binding.referencePaths.length != 1)
		{
			return;
		}
		
		let nextSibling = parentPath.getNextSibling();
		
		if (!nextSibling.isFunctionDeclaration() || !nextSibling.isAncestor(binding.referencePaths[0]))
		{
			return;
		}

		let code = parentPath.toString() + nextSibling.toString();
		
		eval(code)

		let funcName = nextSibling.node.id.name;
		binding = nextSibling.scope.getBinding(funcName);

		let canRemoved = true;
		for (let referPath of binding.referencePaths) {
			let { parentPath, node } = referPath;
			if (!parentPath.isCallExpression({ "callee": node })) {
				canRemoved = false;
				continue;
			}

			let { arguments } = parentPath.node;

			if (arguments.length == 0 || !isNodeLiteral(arguments)) {
				canRemoved = false;
				continue;
			}

			let value = eval(parentPath.toString());
			console.log(parentPath.toString(), "--->", value);
			parentPath.replaceWith(types.valueToNode(value));
		}

		if (canRemoved)
		{
			nextSibling.remove();
			parentPath.remove();
		}
		
	},
}

traverse(ast, getObCode);


const removeDeadFunctionDeclaration =
{
  FunctionDeclaration(path) {
    let { parentPath, node } = path;
    if (parentPath.isProgram()) {
      return;//ȫ�ֺ�����������
    }

    let binding = parentPath.scope.getBinding(node.id.name);
    if (!binding) return;

    let isReferenced = false;
    for (let referPath of binding.referencePaths) {
      if (!path.isAncestor(referPath)) {
        isReferenced = true;
        break;
      }
    }

    if (!isReferenced) {
      console.log(path.toString());
      path.remove();
      traverseFlag = true;
    }
  }
}

do {
  var traverseFlag = false;
  ast = parse(generator(ast).code);
  traverse(ast, removeDeadFunctionDeclaration);
} while (traverseFlag);

function isBaseLiteral(node) {

    if (types.isLiteral(node) && node.value != null) {//null�����п�
        return true;
    }

    if (types.isUnaryExpression(node) && ["+", "-"].includes(node.operator)) {
        return isBaseLiteral(node.argument);
    }

    return false;
}

const restoreVarDeclarator = {
    VariableDeclarator(path) {
        let scope = path.scope;
        let { id, init } = path.node;

        if (!types.isIdentifier(id) || !isBaseLiteral(init)) {
            return;
        }
        
        const binding = scope.getBinding(id.name);

		if (!binding) return;
        
        let { constant, referencePaths, constantViolations } = binding;  //�����Ķ���һ������binding.

        if (constantViolations.length > 1) {
            return;
        }
        
        if (constant || constantViolations[0] == path) {
            for (let referPath of referencePaths) {
                referPath.replaceWith(init);
            }
            path.remove();//û�б����ã������滻��ɣ���ֱ��ɾ��
        }
    },
}

traverse(ast, restoreVarDeclarator);

traverse(ast, keyToLiteral);

traverse(ast, constantFold);

const calcMathFunction = 
{
	CallExpression(path)
	{
		let {callee,arguments} = path.node;

		if (!types.isMemberExpression(callee) || arguments.length != 1 || 
		    !types.isNumericLiteral(arguments[0]))
		{
			return;
		}
        
		let {object,property} = callee;

		if (!types.isIdentifier(object,{"name":"Math"}) || 
		    !types.isStringLiteral(property,{"value":"round"}))
		{
			return;
		}

		let value = Math["round"](arguments[0].value);
		console.log(path.toString(), "--->", value);
		path.replaceWith(types.valueToNode(value));

	}
}

traverse(ast, calcMathFunction);

traverse(ast, constantFold);

traverse(ast, removeDeadCode);