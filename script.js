const MQ = MathQuill.getInterface(3)
const linesContainer = document.getElementById('lines')
const activeLineIndex = 0
const containersWithMathFieldsAndTextAreas = []

function getMathFieldForContainer(container) {
	return containersWithMathFieldsAndTextAreas.find(i => i.container == container).mathField
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

function createEditor() {
	const container = document.createElement('div')
	// When I added a keydown listener after I created the mathfield, the mathfield would update and move the cursor and all before my event listener was called.
	// Apparently most browsers call event listeners in the order they were given, so my event listener had to be added *before* MathQuill's.
	// hence I give the textarea a placeholder event listener at first, and then after I create the mathfield I replace it with the actual one.
	let textAreaKeyDownListener = () => {}
	const textArea = document.createElement('textarea')
	textArea.addEventListener('keydown', e => {
		textAreaKeyDownListener(e)
	})
	const mathField = MQ.MathField(container, {
		autoCommands: 'pi theta sqrt sum',
		autoOperatorNames: 'sin cos tan csc sec cot asin acos atan arcsin arccos arctan',
		substituteTextarea: () => textArea,
	})
	textAreaKeyDownListener = getCustomMathFieldTextareaKeyDown(container, mathField)
	containersWithMathFieldsAndTextAreas.push({ mathField, container, textArea })
	return { mathField, container, textArea }
}

// add first editor
linesContainer.append(createEditor().container)
containersWithMathFieldsAndTextAreas[0].mathField.focus()
