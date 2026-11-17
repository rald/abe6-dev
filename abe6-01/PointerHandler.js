var pointer = {
    x: 0,
    y: 0,
    clientX: 0,
    clientY: 0,
    isDown: false,
    
    // Dragging state properties
    isDragging: false,
    startX: 0,
    startY: 0,
    deltaX: 0,
    deltaY: 0
};

function PointerHandler(element) {
    this.element = element;

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);

    this.element.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);

    this.element.style.touchAction = 'none';
}

PointerHandler.prototype.onPointerDown = function(event) {
    try {
        this.element.setPointerCapture(event.pointerId);
    } catch (err) {}

    var coords = this.getCoordinates(event);
    pointer.x = coords.x;
    pointer.y = coords.y;
    pointer.clientX = coords.clientX;
    pointer.clientY = coords.clientY;
    
    pointer.isDown = true;
    pointer.isDragging = true;
    pointer.startX = coords.x;
    pointer.startY = coords.y;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
};

PointerHandler.prototype.onPointerMove = function(event) {
    var coords = this.getCoordinates(event);
    
    // Update delta if dragging is active
    if (pointer.isDown) {
        pointer.deltaX = coords.x - pointer.x;
        pointer.deltaY = coords.y - pointer.y;
    }

    pointer.x = coords.x;
    pointer.y = coords.y;
    pointer.clientX = coords.clientX;
    pointer.clientY = coords.clientY;
};

PointerHandler.prototype.onPointerUp = function(event) {
    try {
        this.element.releasePointerCapture(event.pointerId);
    } catch (err) {}

    var coords = this.getCoordinates(event);
    pointer.x = coords.x;
    pointer.y = coords.y;
    pointer.clientX = coords.clientX;
    pointer.clientY = coords.clientY;
    
    pointer.isDown = false;
    pointer.isDragging = false;
    pointer.deltaX = 0;
    pointer.deltaY = 0;
};

PointerHandler.prototype.getCoordinates = function(event) {
    var rect = this.element.getBoundingClientRect();

    var canvasWidth = this.element.width;
    var canvasHeight = this.element.height;
    var canvasAspect = canvasWidth / canvasHeight;
    var rectAspect = rect.width / rect.height;

    var renderWidth, renderHeight, offsetX, offsetY;

    if (rectAspect > canvasAspect) {
        renderHeight = rect.height;
        renderWidth = renderHeight * canvasAspect;
        offsetX = rect.left + (rect.width - renderWidth) / 2;
        offsetY = rect.top;
    } else {
        renderWidth = rect.width;
        renderHeight = renderWidth / canvasAspect;
        offsetX = rect.left;
        offsetY = rect.top + (rect.height - renderHeight) / 2;
    }

    var clientX = event.clientX - offsetX;
    var clientY = event.clientY - offsetY;

    var scaleX = canvasWidth / renderWidth;
    var scaleY = canvasHeight / renderHeight;

    return {
        x: clientX * scaleX,
        y: clientY * scaleY,
        clientX: event.clientX,
        clientY: event.clientY
    };
};

PointerHandler.prototype.destroy = function() {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
};
