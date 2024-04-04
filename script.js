const MQ = MathQuill.getInterface(3)
const linesContainer = document.getElementById('lines')
const activeLineIndex = 0
const containersWithMathFieldsAndTextAreas = []

function getMathQuillStaticMath(latex) {
	const container = document.createElement('div')
	container.append(latex)
	MQ.StaticMath(container)
	return container
}

function getMathFieldForContainer(container) {
	return containersWithMathFieldsAndTextAreas.find(i => i.container == container).mathField
}
function getEditorObjectForTextArea(textArea) {
	return containersWithMathFieldsAndTextAreas.find(i => i.textArea == textArea)
}

function insertNewEditorBelow(currentEditorContainer, focus=true) {
	const newEditor = createEditor()
	linesContainer.insertBefore(newEditor.container, currentEditorContainer.nextSibling)
	focus && newEditor.mathField.focus()
}

function ensureEmptyLastMathField() {
	if (getMathFieldForContainer(linesContainer.lastChild).latex() != '') {
		insertNewEditorBelow(linesContainer.lastChild, false)
	}
}

function checkIfCursorIsInToplevelOfRootBlock(container) {
	const rootBlock = container.querySelector('.mq-root-block')
	const cursor = rootBlock.querySelector('.mq-cursor')
	return [...rootBlock.children].includes(cursor)
}

// TODO: remove a lot of repeated code in the two functions below, like the "check if element is 'real' " code
function checkIfCursorIsAtBottomOfMathField(container) {
	const rootBlock = container.querySelector('.mq-root-block')
	const cursor = rootBlock.querySelector('.mq-cursor')
	if (cursor == null) return false
	if (cursor.parentElement == rootBlock) return true

	const checkIfRealElementsInFrontOfElement = element => {
		if (element.nextSibling == null) return false
		if (element.nextSibling.className.includes('mq') && !element.nextSibling.classList.contains('mq-sqrt-prefix')) return true
		return checkIfRealElementsInFrontOfElement(element.nextSibling)
	}
	const recursiveFunction = element => {
		if ([...rootBlock.children].includes(element)) return true
		if (checkIfRealElementsInFrontOfElement(element)) return false
		return recursiveFunction(element.parentElement)
	}
	return recursiveFunction(cursor.parentElement)
}

function checkIfCursorIsAtTopOfMathField(container) {
	const rootBlock = container.querySelector('.mq-root-block')
	const cursor = rootBlock.querySelector('.mq-cursor')
	if (cursor == null) return false
	if (cursor.parentElement == rootBlock) return true

	const checkIfRealElementsBehindElement = element => {
		if (element.previousSibling == null) return false
		if (element.previousSibling.className.includes('mq') && !element.previousSibling.classList.contains('mq-sqrt-prefix')) return true
		return checkIfRealElementsBehindElement(element.previousSibling)
	}
	const recursiveFunction = element => {
		if ([...rootBlock.children].includes(element)) return true
		if (checkIfRealElementsBehindElement(element)) return false
		return recursiveFunction(element.parentElement)
	}
	return recursiveFunction(cursor.parentElement)
}

function checkIfCursorIsAtLeftOfMathField(container) {
	const rootBlock = container.querySelector('.mq-root-block')
	const cursor = rootBlock.querySelector('.mq-cursor')
	return rootBlock.firstElementChild == cursor
}

function checkIfCursorIsAtRightOfMathField(container) {
	const rootBlock = container.querySelector('.mq-root-block')
	const cursor = rootBlock.querySelector('.mq-cursor')
	return rootBlock.lastElementChild == cursor
}

function getCustomMathFieldTextareaKeyDown(container, mathField) {
	const keydownHistory = []
	
	return e => {
		e.key.length == 1 && keydownHistory.push(e.key)

		// ensure there's an empty mathfield at the end (in case this was the "last empty math field", but no longer is)
		setTimeout(ensureEmptyLastMathField)
		
		// make enter create a new editor below
		if (e.key == 'Enter') {
			insertNewEditorBelow(container)
			e.preventDefault()
		}

		// delete math field if it's empty
		if (e.key == 'Backspace' && mathField.latex() == '' && container != linesContainer.firstElementChild) {
			const previousContainer = container.previousElementSibling
			getMathFieldForContainer(previousContainer).focus()
			container.remove()
		}

		// go to the math field above if the cursor isn't in a fraction or something, or to the left if you're already at the top
		if (e.key == 'ArrowUp' && checkIfCursorIsAtTopOfMathField(container)) {
			container.previousElementSibling ? getMathFieldForContainer(container.previousElementSibling).focus() : mathField.moveToLeftEnd()
		}
		// same but below
		if (e.key == 'ArrowDown' && checkIfCursorIsAtBottomOfMathField(container)) {
			container.nextElementSibling ? getMathFieldForContainer(container.nextElementSibling).focus() : mathField.moveToRightEnd()
		}
		// same but left
		if (e.key == 'ArrowLeft' && checkIfCursorIsAtLeftOfMathField(container) && container.previousElementSibling) {
			getMathFieldForContainer(container.previousElementSibling).focus()
		}
		// same but right
		if (e.key == 'ArrowRight' && checkIfCursorIsAtRightOfMathField(container) && container.nextElementSibling) {
			getMathFieldForContainer(container.nextElementSibling).focus()
		}

		const checkKeysToCmdReplacement = (keys, cmd) => {
			if (e.key.length != 1) return
			if (e.ctrlKey) return
			if (keydownHistory.slice(-keys.length).join('') == keys) {
				mathField.keystroke(Array(keys.length - 1).fill('Backspace').join(' '))
				e.preventDefault()
				mathField.cmd(cmd)
			}
		}

		checkKeysToCmdReplacement('+-', '\\pm')
		checkKeysToCmdReplacement('deg', '\\degree')
		checkKeysToCmdReplacement('!=', '\\ne')
		checkKeysToCmdReplacement('~=', '\\approx')
		checkKeysToCmdReplacement('-^', '\\uparrow')
		checkKeysToCmdReplacement('-v', '\\downarrow')
		checkKeysToCmdReplacement('<-', '\\leftarrow')
		checkKeysToCmdReplacement('->', '\\rightarrow')
		checkKeysToCmdReplacement('=^', '\\Uparrow')
		checkKeysToCmdReplacement('=v', '\\Downarrow')
		checkKeysToCmdReplacement('<=', '\\Leftarrow')
		checkKeysToCmdReplacement('=>', '\\Rightarrow')
		
		// make tab create a new editor if you're on the last one
		// commented-out because tab is also used by mathquill
		// if (e.key == 'Tab' && !e.shiftKey) {
		// 	if (linesContainer.lastChild == container) {
		// 		insertNewEditorBelow(container)
		// 		e.preventDefault()
		// 	}
		// }
	}
}

const keyboardContainer = document.createElement('div')
keyboardContainer.style.display = 'none'
keyboardContainer.className = 'keyboard-container'
document.body.append(keyboardContainer)
let keyboardTarget = containersWithMathFieldsAndTextAreas[0]

function createEditor() {
	const container = document.createElement('div')
	// When I added a keydown listener after I created the mathfield, the mathfield would update and move the cursor and all before my event listener was called.
	// Apparently most browsers call event listeners in the order they were given, so my event listener had to be added *before* MathQuill's.
	// hence I give the textarea a placeholder event listener at first, and then after I create the mathfield I replace it with the actual one.
	let textAreaKeyDownListener = () => {}
	const textArea = document.createElement('textarea')
	textArea.inputMode = 'none'  // firefox's android app doesn't believe in this for newly-created lines, chrome works though
	textArea.addEventListener('keydown', e => {
		textAreaKeyDownListener(e)
	})
	const mathField = MQ.MathField(container, {
		autoCommands: 'pi theta sqrt sum',
		autoOperatorNames: 'sin cos tan csc sec cot asin acos atan arcsin arccos arctan',
		substituteTextarea: () => textArea,
	})
	textAreaKeyDownListener = getCustomMathFieldTextareaKeyDown(container, mathField)
	textArea.addEventListener('focus', () => {
		if (/iphone|ipad|ipod|android/i.test(navigator.userAgent)) {
			keyboardContainer.style.display = null
		}
		keyboardTarget = getEditorObjectForTextArea(textArea)
	})
	containersWithMathFieldsAndTextAreas.push({ mathField, container, textArea })
	return { mathField, container, textArea }
}

// add first editor
linesContainer.append(createEditor().container)
containersWithMathFieldsAndTextAreas[0].mathField.focus()

// doesn't work for normal keys like letters and numbers (I think?)
function dispatchKeyboardTargetKeyDown(key) {
	keyboardTarget.textArea.dispatchEvent(new KeyboardEvent('keydown', { key }))
}

function HTMLStringToElement(HTMLString) {
	return new DOMParser().parseFromString(HTMLString, 'text/html').body.childNodes[0]
}

// icons from material symbols
const icons = {
	keyboardReturn: HTMLStringToElement('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="24"><path d="M360-240 120-480l240-240 56 56-144 144h488v-160h80v240H272l144 144-56 56Z"/></svg>'),
	backspace: HTMLStringToElement('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="24"><path d="M360-200q-20 0-37.5-9T294-234L120-480l174-246q11-16 28.5-25t37.5-9h400q33 0 56.5 23.5T840-680v400q0 33-23.5 56.5T760-200H360Zm400-80v-400 400Zm-400 0h400v-400H360L218-480l142 200Zm96-40 104-104 104 104 56-56-104-104 104-104-56-56-104 104-104-104-56 56 104 104-104 104 56 56Z"/></svg>'),
	keyboardHide: HTMLStringToElement('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="24"><path d="M480-40 320-200h320L480-40ZM160-280q-33 0-56.5-23.5T80-360v-400q0-33 23.5-56.5T160-840h640q33 0 56.5 23.5T880-760v400q0 33-23.5 56.5T800-280H160Zm0-80h640v-400H160v400Zm160-40h320v-80H320v80ZM200-520h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80ZM200-640h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80ZM160-360v-400 400Z"/></svg>'),
}

const keyboardKeys = [
	{ label: 'sin', onPress: () => keyboardTarget.mathField.cmd('sin') },
	{ label: 'cos', onPress: () => keyboardTarget.mathField.cmd('cos') },
	{ label: 'tan', onPress: () => keyboardTarget.mathField.cmd('tan') },
	{ label: '°', onPress: () => keyboardTarget.mathField.cmd('\\degree') },
	{ label: '^', onPress: () => keyboardTarget.mathField.typedText('^') },

	{ label: 'x', onPress: () => keyboardTarget.mathField.typedText('x') },
	{ label: '(', onPress: () => keyboardTarget.mathField.typedText('(') },
	{ label: ')', onPress: () => keyboardTarget.mathField.typedText(')') },
	{ label: '√', onPress: () => keyboardTarget.mathField.cmd('sqrt') },
	{ label: '/', onPress: () => keyboardTarget.mathField.typedText('/') },

	{ label: 'y', onPress: () => keyboardTarget.mathField.typedText('y') },
	{ label: '7', onPress: () => keyboardTarget.mathField.typedText('7') },
	{ label: '8', onPress: () => keyboardTarget.mathField.typedText('8') },
	{ label: '9', onPress: () => keyboardTarget.mathField.typedText('9') },
	{ label: '·', onPress: () => keyboardTarget.mathField.typedText('*') },

	{ label: 'θ', onPress: () => keyboardTarget.mathField.cmd('\\theta') },
	{ label: '4', onPress: () => keyboardTarget.mathField.typedText('4') },
	{ label: '5', onPress: () => keyboardTarget.mathField.typedText('5') },
	{ label: '6', onPress: () => keyboardTarget.mathField.typedText('6') },
	{ label: '-', onPress: () => keyboardTarget.mathField.typedText('-') },

	{ label: 'π', onPress: () => keyboardTarget.mathField.cmd('\\pi') },
	{ label: '1', onPress: () => keyboardTarget.mathField.typedText('1') },
	{ label: '2', onPress: () => keyboardTarget.mathField.typedText('2') },
	{ label: '3', onPress: () => keyboardTarget.mathField.typedText('3') },
	{ label: '+', onPress: () => keyboardTarget.mathField.typedText('+') },

	{ label: '_', onPress: () => keyboardTarget.mathField.typedText('_') },
	{ label: '0', onPress: () => keyboardTarget.mathField.typedText('0') },
	{ label: '.', onPress: () => keyboardTarget.mathField.typedText('.') },
	{ label: icons.backspace, onPress: () => dispatchKeyboardTargetKeyDown('Backspace') },
	{ label: '=', onPress: () => keyboardTarget.mathField.typedText('=') },

	{ label: '', onPress: () => {} },
	{ label: '', onPress: () => {} },
	{ label: '', onPress: () => {} },
	{ label: icons.keyboardHide, onPress: () => keyboardContainer.style.display = 'none', refocusMathField: false },
	{ label: icons.keyboardReturn, onPress: () => insertNewEditorBelow(keyboardTarget.container) },
]

for (const key of keyboardKeys) {
	const button = document.createElement('button')
	keyboardContainer.append(button)
	button.append(key.label)
	button.onclick = e => {
		key.refocusMathField != false && keyboardTarget.mathField.focus()
		key.onPress(e)
	}
}
