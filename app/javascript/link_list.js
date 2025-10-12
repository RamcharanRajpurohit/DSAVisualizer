// Konva setup
Konva.pixelRatio = 1;
const width = window.innerWidth - 40;
const height = window.innerHeight * 0.7;
const stage = new Konva.Stage({ container: 'container', width, height });
const layer = new Konva.Layer();
stage.add(layer);

// Utility functions
const updateStatus = (text) => {
    document.getElementById('status-bar').textContent = `Status: ${text}`;
};

const updateListView = (list) => {
    const listView = document.getElementsByClassName('listView')[0];
    listView.innerHTML = '';
    
    if (list.isEmpty()) {
        listView.innerHTML = '<p>Empty List</p>';
        return;
    }
    
    let current = list.head;
    let index = 0;
    
    do {
        if (index > 0) {
            const arrow = document.createElement('span');
            arrow.textContent = ' → ';
            arrow.style.margin = '0 5px';
            listView.appendChild(arrow);
        }
        
        const element = document.createElement('div');
        element.className = 'list-element';
        element.textContent = current.value;
        listView.appendChild(element);
        
        current = current.next;
        index++;
        if (list.isCircular && current === list.head) break;
    } while (current !== null);
    
    if (list.isCircular) {
        const arrow = document.createElement('span');
        arrow.textContent = ' ↩ ';
        arrow.style.margin = '0 5px';
        listView.appendChild(arrow);
    }
};

// Node class
class Node {
    constructor(value) {
        this.value = value;
        this.next = null;
        this.prev = null;
        this.nodeGroup = null;
    }
}

// LinkedList class
class LinkedList {
    constructor(type = 'singly') {
        this.head = null;
        this.tail = null;
        this.type = type;
        this.isDoubly = type === 'doubly' || type === 'circularDoubly';
        this.isCircular = type === 'circular' || type === 'circularDoubly';
        this.nodeRadius = 30;
        this.nodeSpacing = 120;
        this.arrowLines = {};
        this.size = 0;
    }
    
    isEmpty() { return this.head === null; }
    
    calculateNodePositions() {
        const startX = Math.min(100, window.innerWidth * 0.1);
        const startY = height / 2;
        const spacing = Math.min(this.nodeSpacing, (window.innerWidth - 2 * startX) / Math.max(10, this.size));
        return Array.from({ length: Math.max(20, this.size) }, (_, i) => ({
            x: startX + i * spacing,
            y: startY
        }));
    }
    
    async animateNode(node, props, duration = 0.5) {
        return new Promise(resolve => {
            new Konva.Tween({ node, duration, ...props, onFinish: resolve }).play();
        });
    }
    
    async createNode(node, position, skipAnimation = false) {
        const group = new Konva.Group({ x: position.x, y: position.y, opacity: skipAnimation ? 1 : 0 });
        
        group.add(new Konva.Circle({ radius: this.nodeRadius, fill: '#4CAF50', stroke: '#333', strokeWidth: 2 }));
        group.add(new Konva.Text({
            text: node.value.toString(),
            fontSize: 18,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            fill: 'white',
            align: 'center',
            verticalAlign: 'middle',
            x: -this.nodeRadius,
            y: -9,
            width: this.nodeRadius * 2
        }));
        
        if (this.isDoubly) {
            group.add(new Konva.Text({
                text: 'prev', fontSize: 12, fontFamily: 'Arial', fill: '#333',
                align: 'center', x: -this.nodeRadius, y: -this.nodeRadius - 20,
                width: this.nodeRadius * 2
            }));
        }
        
        group.add(new Konva.Text({
            text: 'next', fontSize: 12, fontFamily: 'Arial', fill: '#333',
            align: 'center', x: -this.nodeRadius, y: this.nodeRadius + 5,
            width: this.nodeRadius * 2
        }));
        
        layer.add(group);
        node.nodeGroup = group;
        
        if (!skipAnimation) {
            await this.animateNode(group, { opacity: 1, easing: Konva.Easings.ElasticEaseOut });
        }
    }
    
    async createArrow(fromNode, toNode, isReverse = false, skipAnimation = false) {
        if (!fromNode.nodeGroup || !toNode.nodeGroup) return;
        
        const key = `${fromNode.value}-${toNode.value}-${isReverse ? 'prev' : 'next'}`;
        const startX = fromNode.nodeGroup.x() + (isReverse ? -this.nodeRadius : this.nodeRadius);
        const endX = toNode.nodeGroup.x() + (isReverse ? this.nodeRadius : -this.nodeRadius);
        const color = isReverse ? '#ff9800' : '#2196F3';
        
        const arrow = new Konva.Arrow({
            points: [startX, fromNode.nodeGroup.y(), endX, toNode.nodeGroup.y()],
            pointerLength: 10, pointerWidth: 10, fill: color, stroke: color,
            strokeWidth: 2, opacity: skipAnimation ? 1 : 0
        });
        
        layer.add(arrow);
        arrow.moveToBottom();
        this.arrowLines[key] = arrow;
        
        if (!skipAnimation) {
            await this.animateNode(arrow, { opacity: 1, duration: 0.3, easing: Konva.Easings.EaseInOut });
        }
    }
    
    async removeNode(node) {
        if (!node || !node.nodeGroup) return;
        
        await this.animateNode(node.nodeGroup, {
            y: node.nodeGroup.y() - 100,
            opacity: 0,
            duration: 0.7,
            easing: Konva.Easings.EaseIn
        });
        
        Object.keys(this.arrowLines).forEach(key => {
            if (key.includes(`${node.value}-`)) {
                this.arrowLines[key].destroy();
                delete this.arrowLines[key];
            }
        });
        
        node.nodeGroup.destroy();
        node.nodeGroup = null;
        layer.batchDraw();
    }
    
    async highlightNode(node, color = '#e91e63', duration = 1) {
        if (!node || !node.nodeGroup) return;
        
        const circle = node.nodeGroup.findOne('Circle');
        const originalFill = circle.fill();
        circle.fill(color);
        layer.batchDraw();
        
        await new Promise(resolve => setTimeout(resolve, duration * 1000));
        await this.animateNode(circle, { fill: originalFill, duration: 0.4, easing: Konva.Easings.EaseOut });
    }
    
    async moveNode(node, newPosition) {
        if (!node || !node.nodeGroup) return;
        await this.animateNode(node.nodeGroup, { x: newPosition.x, y: newPosition.y, duration: 0.8, easing: Konva.Easings.EaseInOut });
    }
    
    async redrawArrows() {
        Object.values(this.arrowLines).forEach(arrow => arrow.destroy());
        this.arrowLines = {};
        if (this.isEmpty()) return;
        
        let current = this.head;
        do {
            if (current.next) await this.createArrow(current, current.next, false, true);
            if (this.isDoubly && current.prev) await this.createArrow(current, current.prev, true, true);
            current = current.next;
            if (this.isCircular && current === this.head) break;
        } while (current !== null);
        
        layer.batchDraw();
    }
    
    async redrawList() {
        const positions = this.calculateNodePositions();
        if (this.isEmpty()) return;
        
        let current = this.head;
        let index = 0;
        const promises = [];
        
        do {
            promises.push(this.moveNode(current, positions[index]));
            current = current.next;
            index++;
            if (this.isCircular && current === this.head) break;
        } while (current !== null);
        
        await Promise.all(promises);
        await this.redrawArrows();
    }
    
    async insertAtHead(value) {
        const newNode = new Node(value);
        
        if (this.isEmpty()) {
            this.head = this.tail = newNode;
            if (this.isCircular) {
                newNode.next = newNode;
                if (this.isDoubly) newNode.prev = newNode;
            }
        } else {
            newNode.next = this.head;
            if (this.isDoubly) this.head.prev = newNode;
            this.head = newNode;
            if (this.isCircular) {
                this.tail.next = this.head;
                if (this.isDoubly) this.head.prev = this.tail;
            }
        }
        
        this.size++;
        await this.visualizeList();
        updateStatus(`Inserted ${value} at the head`);
        updateListView(this);
    }
    
    async insertAtTail(value) {
        const newNode = new Node(value);
        
        if (this.isEmpty()) {
            this.head = this.tail = newNode;
            if (this.isCircular) {
                newNode.next = newNode;
                if (this.isDoubly) newNode.prev = newNode;
            }
        } else {
            this.tail.next = newNode;
            if (this.isDoubly) newNode.prev = this.tail;
            this.tail = newNode;
            if (this.isCircular) {
                this.tail.next = this.head;
                if (this.isDoubly) this.head.prev = this.tail;
            }
        }
        
        this.size++;
        await this.visualizeList();
        updateStatus(`Inserted ${value} at the tail`);
        updateListView(this);
    }
    
    async insertAtPosition(value, position) {
        if (position < 0 || position > this.size) {
            updateStatus(`Invalid position: ${position}. Valid range: 0 to ${this.size}`);
            return;
        }
        
        if (position === 0) return await this.insertAtHead(value);
        if (position === this.size) return await this.insertAtTail(value);
        
        const newNode = new Node(value);
        let current = this.head;
        for (let i = 0; i < position - 1; i++) current = current.next;
        
        await this.highlightNode(current, '#e91e63');
        
        newNode.next = current.next;
        if (this.isDoubly) {
            newNode.prev = current;
            current.next.prev = newNode;
        }
        current.next = newNode;
        
        this.size++;
        await this.visualizeList();
        updateStatus(`Inserted ${value} at position ${position}`);
        updateListView(this);
    }
    
    async deleteFromHead() {
        if (this.isEmpty()) {
            updateStatus("List is empty");
            return null;
        }
        
        const deletedValue = this.head.value;
        await this.highlightNode(this.head, '#f44336');
        
        if (this.head === this.tail) {
            await this.removeNode(this.head);
            this.head = this.tail = null;
        } else {
            const oldHead = this.head;
            this.head = this.head.next;
            if (this.isDoubly) this.head.prev = this.isCircular ? this.tail : null;
            if (this.isCircular) this.tail.next = this.head;
            await this.removeNode(oldHead);
        }
        
        this.size--;
        await this.visualizeList();
        updateStatus(`Deleted ${deletedValue} from head`);
        updateListView(this);
        return deletedValue;
    }
    
    async deleteFromTail() {
        if (this.isEmpty()) {
            updateStatus("List is empty");
            return null;
        }
        
        const deletedValue = this.tail.value;
        await this.highlightNode(this.tail, '#f44336');
        
        if (this.head === this.tail) {
            await this.removeNode(this.head);
            this.head = this.tail = null;
        } else {
            let current = this.head;
            while (current.next !== this.tail) current = current.next;
            
            current.next = this.isCircular ? this.head : null;
            if (this.isCircular && this.isDoubly) this.head.prev = current;
            
            await this.removeNode(this.tail);
            this.tail = current;
        }
        
        this.size--;
        await this.visualizeList();
        updateStatus(`Deleted ${deletedValue} from tail`);
        updateListView(this);
        return deletedValue;
    }
    
    async deleteAtPosition(position) {
        if (position < 0 || position >= this.size) {
            updateStatus(`Invalid position: ${position}`);
            return null;
        }
        
        if (position === 0) return await this.deleteFromHead();
        if (position === this.size - 1) return await this.deleteFromTail();
        
        let current = this.head;
        for (let i = 0; i < position - 1; i++) current = current.next;
        
        await this.highlightNode(current.next, '#f44336');
        
        const deletedNode = current.next;
        const deletedValue = deletedNode.value;
        
        current.next = deletedNode.next;
        if (this.isDoubly) deletedNode.next.prev = current;
        
        await this.removeNode(deletedNode);
        this.size--;
        await this.visualizeList();
        updateStatus(`Deleted ${deletedValue} from position ${position}`);
        updateListView(this);
        return deletedValue;
    }
    
    async search(value) {
        if (this.isEmpty()) {
            updateStatus("List is empty");
            return -1;
        }
        
        let current = this.head;
        let index = 0;
        
        do {
            await this.highlightNode(current, '#2196F3', 0.5);
            
            if (current.value == value) {
                await this.highlightNode(current, '#4CAF50', 1.5);
                updateStatus(`Found value ${value} at position ${index}`);
                return index;
            }
            
            current = current.next;
            index++;
            if (this.isCircular && current === this.head) break;
        } while (current !== null);
        
        updateStatus(`Value ${value} not found`);
        return -1;
    }
    
    async reverse() {
        if (this.isEmpty() || this.size === 1) {
            updateStatus("Nothing to reverse");
            return;
        }
        
        let current = this.head;
        let prev = null;
        
        if (this.isCircular) {
            this.tail.next = null;
            if (this.isDoubly) this.head.prev = null;
        }
        
        const oldHead = this.head;
        
        do {
            await this.highlightNode(current, '#9c27b0', 0.5);
            const next = current.next;
            current.next = prev;
            if (this.isDoubly) current.prev = next;
            prev = current;
            current = next;
        } while (current !== null);
        
        this.tail = oldHead;
        this.head = prev;
        
        if (this.isCircular) {
            this.tail.next = this.head;
            if (this.isDoubly) this.head.prev = this.tail;
        }
        
        await this.visualizeList();
        updateStatus("List reversed");
        updateListView(this);
    }
    
    async clear() {
        if (this.isEmpty()) {
            updateStatus("List is already empty");
            return;
        }
        
        let current = this.head;
        const promises = [];
        
        do {
            promises.push(this.highlightNode(current, '#f44336', 0.5));
            const node = current;
            current = current.next;
            if (node.nodeGroup) node.nodeGroup.destroy();
            if (this.isCircular && current === this.head) break;
        } while (current !== null);
        
        await Promise.all(promises);
        
        Object.values(this.arrowLines).forEach(arrow => arrow.destroy());
        this.head = this.tail = null;
        this.size = 0;
        this.arrowLines = {};
        
        layer.batchDraw();
        updateStatus("List cleared");
        updateListView(this);
    }
    
    async visualizeList() {
        layer.destroyChildren();
        this.arrowLines = {};
        
        if (this.isEmpty()) {
            layer.batchDraw();
            return;
        }
        
        const positions = this.calculateNodePositions();
        let current = this.head;
        let index = 0;
        
        do {
            await this.createNode(current, positions[index], true);
            current = current.next;
            index++;
            if (this.isCircular && current === this.head) break;
        } while (current !== null);
        
        current = this.head;
        do {
            if (current.next) await this.createArrow(current, current.next, false, true);
            if (this.isDoubly && current.prev) await this.createArrow(current, current.prev, true, true);
            current = current.next;
            if (this.isCircular && current === this.head) break;
        } while (current !== null);
        
        layer.batchDraw();
    }
}

// Initialize
let list = new LinkedList('singly');

// Event handlers
const handlers = {
    listTypeSelect: () => {
        list = new LinkedList(document.getElementById('listTypeSelect').value);
        layer.destroyChildren();
        layer.batchDraw();
        updateStatus(`Switched to ${list.type} linked list`);
        updateListView(list);
    },
    insertHeadBtn: async () => {
        const val = parseInt(document.getElementById('valueInput').value);
        if (isNaN(val)) return updateStatus("Enter valid number");
        await list.insertAtHead(val);
        document.getElementById('valueInput').value = '';
    },
    insertTailBtn: async () => {
        const val = parseInt(document.getElementById('valueInput').value);
        if (isNaN(val)) return updateStatus("Enter valid number");
        await list.insertAtTail(val);
        document.getElementById('valueInput').value = '';
    },
    insertPosBtn: async () => {
        const val = parseInt(document.getElementById('valueInput').value);
        const pos = parseInt(document.getElementById('positionInput').value);
        if (isNaN(val) || isNaN(pos)) return updateStatus("Enter valid inputs");
        await list.insertAtPosition(val, pos);
        document.getElementById('valueInput').value = '';
        document.getElementById('positionInput').value = '';
    },
    deleteHeadBtn: async () => await list.deleteFromHead(),
    deleteTailBtn: async () => await list.deleteFromTail(),
    deletePosBtn: async () => {
        const pos = parseInt(document.getElementById('positionInput').value);
        if (isNaN(pos)) return updateStatus("Enter valid position");
        await list.deleteAtPosition(pos);
        document.getElementById('positionInput').value = '';
    },
    searchBtn: async () => {
        const val = parseInt(document.getElementById('valueInput').value);
        if (isNaN(val)) return updateStatus("Enter valid number");
        await list.search(val);
        document.getElementById('valueInput').value = '';
    },
    reverseBtn: async () => await list.reverse(),
    clearBtn: async () => await list.clear(),
    randomBtn: async () => await list.insertAtTail(Math.floor(Math.random() * 100)),
    preloadBtn: async () => {
        for (let i = 0; i < 10; i++) {
            await list.insertAtTail(Math.floor(Math.random() * 100));
        }
    }
};

// Attach event handlers
Object.keys(handlers).forEach(id => {
    document.getElementById(id).addEventListener('click', handlers[id]);
});

// Window resize
window.addEventListener('resize', () => {
    stage.width(window.innerWidth - 40);
    stage.height(window.innerHeight * 0.7);
    list.visualizeList();
});

updateStatus("Select a list type and add elements to visualize");
updateListView(list);