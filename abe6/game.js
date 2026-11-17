Game = function(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = canvas.getContext("2d");

    this.GameState = {
        LOAD: "LOAD",
        INIT: "INIT",
        PLAY: "PLAY",
        STOP: "STOP"
    };

    this.assetsToLoad = [
        { id: 'circle', type: 'image', src: "assets/circle.png" },
        { id: 'cross', type: 'image', src: "assets/cross.png" },
        { id: 'triangle', type: 'image', src: "assets/triangle.png" },
        { id: 'square', type: 'image', src: "assets/square.png" },
        { id: 'sono', family: 'sono', type: 'font', src: "assets/sono/web/Sono-Bold.woff2" },
        { id: 'wordlist', type: 'text', src: 'assets/wordlist.txt' }
    ];

    this.allottedTime = 180;
    this.remainingTime = 0;

    this.gameState = this.GameState.LOAD;

	this.preloadCompleteTime = null;
	this.loadedAssets = {};
	this.itemsLoaded = 0;
	this.totalItems = this.assetsToLoad.length;
	this.currentProgress = 0;
	this.targetProgress = 0;

    this.wordlists = null;
    this.pressStart = null;

    this.messages=[];
    this.messageTicks=0;
    this.messageDelay=0;

	this.timeTickInterval=null;

    this.trie=null;    
    this.board=null;
    this.words=null;
};

Game.prototype.drawProgressBar = function(percent) {
    Graphics.clrscr(this.ctx, palette[0]);

    var barWidth = 180;
    var barHeight = 16;
    var x = (canvas.width - barWidth) / 2;
    var y = (canvas.height - barHeight) / 2;

    this.ctx.strokeStyle = palette[1];
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, barWidth, barHeight);

    this.ctx.fillStyle = palette[5];
    this.ctx.fillRect(x + 2, y + 2, (barWidth - 4) * percent, barHeight - 4);
};

Game.prototype.onItemLoaded = function(id, assetData) {
    this.loadedAssets[id] = assetData;
    this.itemsLoaded++;
    this.targetProgress = this.itemsLoaded / this.totalItems;
};

Game.prototype.loadTextAsset = function(item) {
    var self = this; // Save reference to Game instance
    var xhr = new XMLHttpRequest();
    xhr.open('GET', item.src, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200 || (xhr.status === 0 && xhr.responseText)) {
                self.onItemLoaded(item.id, xhr.responseText);
            } else {
                console.warn('Missing text file (using fallback): ' + item.src);
                self.onItemLoaded(item.id, null);
            }
        }
    };
    xhr.send();
};

Game.prototype.loadImageAsset = function(item) {
    var self = this; // Save reference to Game instance
    var img = new Image();
    img.onload = function() {
        self.onItemLoaded(item.id, img);
    };
    img.onerror = function() {
        console.warn('Missing image file (using fallback): ' + item.src);
        self.onItemLoaded(item.id, null);
    };
    img.src = item.src;
};

Game.prototype.loadFontAsset = function(item) {
    var self = this; // Save reference to Game instance
    var fontFace = new FontFace(item.family || item.id, 'url(' + item.src + ')');

    fontFace.load().then(function(loadedFace) {
        document.fonts.add(loadedFace);
        self.onItemLoaded(item.id, loadedFace);
    }).catch(function(err) {
        console.warn('Missing or invalid font file (using fallback): ' + item.src, err);
        self.onItemLoaded(item.id, null);
    });
};

Game.prototype.preload = function() {
    this.gameState = this.GameState.LOAD;
    this.currentProgress = 0;
    this.targetProgress = 0;
    this.preloadCompleteTime = null;

    if (this.assetsToLoad.length === 0) {
        this.targetProgress = 1.0;
        this.itemsLoaded = 0;
        this.totalItems = 1;
        this.onItemLoaded('dummy', true);
        return;
    }

    for (var i = 0; i < this.assetsToLoad.length; i++) {
        var item = this.assetsToLoad[i];
        if (item.type === 'text') {
            this.loadTextAsset(item);
        } else if (item.type === 'image') {
            this.loadImageAsset(item);
        } else if (item.type === 'font') {
            this.loadFontAsset(item);
        }
    }
};

Game.prototype.addMessage = function(msg) {
    this.messages.push(msg);
};

Game.prototype.timeTick = function() {
    if (this.messages.length > 0) {
        if (this.messageTicks >= this.messageDelay) {
            this.messageTicks = 0;
            this.messages.shift();
        }
        this.messageTicks++;
    } else if (this.messageTicks > 0) {
        this.messageTicks = 0;
    }

    if (this.gameState === this.GameState.PLAY) {
        this.remainingTime = this.allottedTime - this.currentTime;
        if (this.remainingTime <= 0) {
            this.remainingTime = 0;
            this.messages.push("Time is up!");
            this.gameState = this.GameState.STOP;
        }
        this.currentTime++;
    }
};

Game.prototype.doPreload = function() {
    var diff = this.targetProgress - this.currentProgress;
    this.currentProgress += diff * 0.15;

    if (this.itemsLoaded >= this.totalItems && (this.targetProgress - this.currentProgress < 0.01 || this.currentProgress > 0.99)) {
        this.currentProgress = 1.0;
    }

    this.drawProgressBar(this.currentProgress);

    if (this.currentProgress === 1.0) {
        var now = performance.now();
        if (!this.preloadCompleteTime) {
            this.preloadCompleteTime = now;
        }

        var delayMs = 300;
        if (now - this.preloadCompleteTime >= delayMs) {

            if (this.loadedAssets.wordlist) this.wordlists = this.loadedAssets.wordlist.trim().split(/\r\n|\n|\r/).map(word => word.toUpperCase());

            if (this.loadedAssets.pressStart) this.pressStart = this.loadedAssets.pressStart;

            this.trie = new Trie();
            for (var i = 0; i < this.wordlists.length; i++) {
                this.trie.insert(this.wordlists[i]);
            }

            this.diceFont=new Font("16px sono","center","middle");

            this.gameState = this.GameState.INIT;
        }
    }
}

Game.prototype.generateBoggleBoard=function() {
  var dice = MODERN_BOGGLE_DICE.slice();
  var i, j, temp;

  // Fisher-Yates shuffle
  for (i = dice.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1));
    temp = dice[i];
    dice[i] = dice[j];
    dice[j] = temp;
  }

  this.board = [];
  for (var r = 0; r < 4; r++) {
    var row = [];
    for (var c = 0; c < 4; c++) {
      var die = dice[r * 4 + c];
      var face = die[Math.floor(Math.random() * die.length)];
      row.push(face);
    }
    this.board.push(row);
  }
}

function scoreWord(word) {
  var length = word.length;
  if (length < 3) {
    return 0;
  }
  if (length <= 4) {
    return 1;
  }
  if (length === 5) {
    return 2;
  }
  if (length === 6) {
    return 3;
  }
  if (length === 7) {
    return 5;
  }
  return 11;
}

Game.prototype.getBoggleWords=function(board, trie) {
  var rows = board.length;
  var cols = board[0].length;
  var foundWordsMap = Object.create(null);
  var visited = [];

  for (var r = 0; r < rows; r++) {
    visited[r] = [];
    for (var c = 0; c < cols; c++) {
      visited[r][c] = false;
    }
  }

  var directions = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
  ];

  function dfs(r, c, node, currentWord) {
    var tile = board[r][c].toUpperCase();
    var currNode = node;

    for (var i = 0; i < tile.length; i++) {
      var ch = tile.charAt(i);
      if (!currNode.children[ch]) {
        return;
      }
      currNode = currNode.children[ch];
    }

    var nextWord = currentWord + tile;

    if (currNode.isEndOfWord) {
      foundWordsMap[nextWord] = true;
    }

    visited[r][c] = true;

    for (var d = 0; d < directions.length; d++) {
      var nr = r + directions[d][0];
      var nc = c + directions[d][1];
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
        dfs(nr, nc, currNode, nextWord);
      }
    }

    visited[r][c] = false;
  }

  for (var rStart = 0; rStart < rows; rStart++) {
    for (var cStart = 0; cStart < cols; cStart++) {
      dfs(rStart, cStart, trie.root, '');
    }
  }

  this.words = Object.keys(foundWordsMap);
  this.words.sort(function (a, b) {
    var scoreDiff = scoreWord(b) - scoreWord(a);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  });

}


Game.prototype.doInit = function() {
    this.messages=[];
    this.messagesTicks=0;
    this.messagesDelay=1000;

    this.generateBoggleBoard();
    this.getBoggleWords(this.board,this.trie);
    console.table(this.words);

    this.gameState=this.GameState.PLAY;
}

Game.prototype.doPlay = function() {
    Graphics.clrscr(this.ctx, palette[0]);
    Graphics.fillRect(this.ctx,0,0,canvas.width,canvas.height,palette[0]);

    for(var j=0;j<this.board.length;j++) {
        for(var i=0;i<this.board[j].length;i++) {

            var g=4;
            var w=32;
            var h=32;
            var cx=(canvas.width-(32+g)*this.board.length)/2;
            var cy=canvas.height-(32+g)*this.board.length-8;
            var x=i*(w+g)+cx;
            var y=j*(h+g)+cy;
            var dx=i*(w+g)+Math.floor(w/2)+cx;
            var dy=j*(h+g)+Math.floor(h/2)+cy;

            Graphics.drawRect(this.ctx,x,y,32,32,palette[12]);

            this.diceFont.fillText(this.ctx,this.board[j][i],dx,dy,palette[12]);
        }    
    }    
}

Game.prototype.doEnd = function() {
    Graphics.clrscr(this.ctx, palette[0]);
}

Game.prototype.draw = function() {
    var self = this;
    switch (this.gameState) {
        case this.GameState.LOAD:
            this.doPreload();
            break;
        case this.GameState.INIT:
            this.doInit();
            break;
        case this.GameState.PLAY:
            this.doPlay();
            break;
        case this.GameState.STOP:
            this.doEnd();
            break;
        default:
            break;
    }
    window.requestAnimationFrame(function() {self.draw();});
};

Game.prototype.setup = function() {
    var self = this;

    this.canvas.width = 256;
    this.canvas.height = 256 + 128;

    this.timeTickInterval = setInterval(function() {
        self.timeTick();
    }, 1000);

    this.preload();

    window.requestAnimationFrame(function(){self.draw();});
};

window.onload = function() {
    window.addEventListener('contextmenu', (event) => {
        event.preventDefault();
    });

    var game = new Game("canvas");
    game.setup();
};
