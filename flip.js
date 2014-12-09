/**
 * Flip
 *
 * Content loaded and processed by demand
 * Template and data separated
 * Mustache and Handlebars ready
 * Easy to infinity scroll
 * Extensible
 *
 * @author Alejandro Moraga <moraga86@gmail.com>
 */
(function(root, factory) {
	if (typeof exports == 'object' && exports)
		factory(exports);
	else {
		var flip = {}
		
		factory(flip);
		
		if (typeof define == 'function' && define.amd) {
			define(flip);
		}
		else {
			root.Flip = flip;
		}
	}
})(this, function(flip) {
	/**
	 * Flip class
	 * @class
	 */
	function Flip() {
		this.construct.apply(this, arguments);
	}
	
	Flip.prototype = {
		/**
		 * Starts from this page
		 * @var int
		 */
		start: 0,
		
		/**
		 * Navigates page by page
		 * @var bool
		 */
		singly: true,
		
		/**
		 * Shared data
		 * @var Object
		 */
		data: {},
		
		/**
		 * Registered keys and actions
		 * @var Object
		 */
		keys: {
			27: ['esc'  , 'prev'],
			38: ['up'   , 'prev'],
			37: ['left' , 'prev'],
			13: ['enter', 'next'],
			39: ['right', 'next'],
			40: ['down' , 'next']
		},
		
		/**
		 * Indexed pages
		 * @var array
		 */
		pages: [],
		
		/**
		 * Non-indexed pages
		 * @var array
		 */
		nodex: [],
		
		/**
		 * Current page
		 * @var Page
		 */
		page: null,
		
		/**
		 * Current page index
		 * @var number
		 */
		current: -1,
		
		/**
		 * Lock status
		 * @var bool
		 */
		locked: false,
		
		/**
		 * Available width
		 * @var number
		 */
		width: -1,
		
		/**
		 * Available height
		 * @var number
		 */
		height: -1,
		
		/**
		 * Page transition delay
		 * @var number
		 */
		delay: 700,
		
		/**
		 * Flip counter
		 * @var number
		 */
		flip: 0,
		
		/**
		 * Container
		 * @var jQuery
		 */
		dom: null,
		
		/**
		 * Page auto increment id
		 * @var number
		 */
		auto_increment: 1,
		
		/**
		 * Constructor
		 * @param object|string settings
		 */
		construct: function(settings) {
			switch (typeof settings) {
				case 'string':
					this.dom = settings;
					break;
				
				case 'object':
					$.extend(this, settings);
					break;
			}
			
			this.dom = $(this.dom);
			
			// set all compositions
			Tools.composite(this, Flip);
		},
		
		/**
		 * Adds a page
		 * @param Page page A page
		 * @return TRUE
		 */
		add: function(page) {
			page.id = this.auto_increment++;
			page.flip = this;
			
			// get shared data by page name
			if (page.name in this.data)
				page.data = this.data[page.name];
			
			// creates the DOM element if not exists
			if (page.dom == null)
				page.dom = $(document.createElement('div')).appendTo(this.dom).css('height', this.height);
			
			// make marker regex
			if (typeof page.marker == 'string')
				page.marker = new RegExp('^'+ page.marker.replace(/\//g, '\\/') +'$');
			
			// hide content if not indexed
			if (page.index == false)
				page.dom.hide();
			
			if (page.load)
				page.init();
			
			this[page.index ? 'pages' : 'nodex'].push(page);
			
			this.trigger('update', [page]);
			
			return true;
		},
		
		/**
		 * Page objects iterator
		 * @param Function fn A function
		 */
		each: function(fn) {
			for (var i=0, len=this.pages.length; i < len; fn.call(this.pages[i], i++));
		},
		
		/**
		 * Go to previous page
		 * @param bool direct
		 * @param string origin
		 * @return bool TRUE on success, FALSE on failure
		 */
		prev: function(direct, origin) {
			return this.goto(this.current - 1, direct, origin);
		},
		
		/**
		 * Go to previous page
		 * @param bool direct
		 * @param string origin
		 * @return bool TRUE on success, FALSE on failure
		 */
		next: function(direct, origin) {
			return this.goto(this.current + 1, direct, origin);
		},
		
		/**
		 * Get a page
		 * @param page number|string|object Page number, name or object
		 * @return Page|false The page, or FALSE
		 */
		get: function(page) {
			for (var lst=this.pages.concat(this.nodex), i=lst.length; i--;)
				if (lst[i] == page || lst[i].id == page || lst[i].name == page)
					return lst[i];
			return false;
		},
		
		/**
		 * Checks whether a page exists in this flip
		 * @return bool
		 */
		has: function(n) {
			return typeof n == 'object' ? n.position() > -1 : !!this.pages[n];
		},
		
		/**
		 * Checks whether exists previous page
		 * @return bool
		 */
		hasPrev: function() {
			return this.current > 0;
		},
		
		/**
		 * Checks whether exists next page
		 * @return bool
		 */
		hasNext: function() {
			return this.pages.length > this.current + 1;
		},
		
		/**
		 * Marks the current page
		 * @param string marker Optional marker
		 * @return string The marker
		 */
		mark: function(marker) {
			this.trigger('mark', [marker = location.hash = marker || this.page.mask || this.page.marker.toString().slice(2, -2).replace(/\\/g, '')]);
			return marker;
		},
		
		/**
		 * Gets the current marker
		 * @return string|null Returns the current marker
		 */
		marker: function() {
			return location.hash.substr(1).replace(/\/+/, '/') || null;
		},
		
		/**
		 * Locks the flip
		 * @return void
		 */
		lock: function() {
			this.locked = true;
		},
		
		/**
		 * Unlocks the flip
		 * @return void
		 */
		unlock: function() {
			this.locked = false;
		},
		
		/**
		 * Go to a indexed page
		 * @param number|Page n Index or page
		 * @param bool direct
		 * @param string origin 
		 * @return bool TRUE on sucess, FALSE on failure
		 */
		goto: function(n, direct, origin) {
			// gets the index from the object
			if (typeof n == 'object')
				n = n.position();
			
			// stop if the page not exists or is the current
			if (!this.has(n) || n == this.current)
				return false;
			
			var prev = this.page,
				next = this.pages[n];
			
			// dispatch out events from previous page
			if (prev) {
				if (prev.steps && origin == 'user' && prev.step(null, n > prev.position() ? 1 : -1))
					return true;
				prev.exit();
				prev.trigger('beforeleave');
				if (this.locked)
					return false;
			}
			
			// update references
			this.page = next;
			this.current = n;
			this.flip++;
			
			// initialize the next page
			next.init();
			
			// loads the previous page if required
			if (next.load_prev && next.prev())
				next.prev().init();
			
			// loads the next page if required
			if (next.load_next && next.next())
				next.next().init();
			
			next.trigger('beforeenter');
			
			// marks the page
			this.mark();
			
			var move = [
				null, // dom element
				null, // anim properties
				direct ? 0 : next.slide_duration,
				function() {
					// global page reference
					window.page = next;
					next.flip.trigger('flip', [next, prev]);
					if (prev)
						prev.trigger('leave');
					next.trigger('enter');
				}
			];
			
			if (this.singly) {
				move[0] = this.dom;
				move[1] = {top: n * this.height * -1};
			}
			else {
				move[0] = $('html,body');
				move[1] = {scrollTop: this.page.dom.offset().top - this.dom.offset().top};
			}
			
			Function.call.apply(move[0].animate, move);
			
			return true;
		},
		
		/**
		 * Initializes the Flip
		 * @return Flip
		 */
		init: function() {
			var self = this,
				marker = this.marker(),
				start = this.start,
				move = function(func) {
					if (move.locked == false) {
						move.locked = true;
						func(); // call
						setTimeout(function() {
							move.locked = false;
						},  move.delay);
					}
				},
				component;
			
			move.delay = self.delay;
			move.locked = false;
			
			// parse dom child nodes
			this.dom.children().each(function(i) {
				var page = new Page;
				
				page.name = this.id;
				page.dom = $(this);
				
				// parse tag attributes
				for (var j=0; j < this.attributes.length; j++)
					if (this.attributes[j].name.substr(0, 5) == 'data-')
						Tools.attr.map(page, this.attributes[j].name
							.substr(5).replace(/\-/g, '_'), this.attributes[j].value);
				
				// add to flip
				self.add(page);
				
				// start from this page
				if ((marker && page.match(marker)) || page.start)
					start = page;
			});

			// singly mode
			if (this.singly) {
				// mousewheel detached for compatibility
				function mousewheel(event) {
					move(function() {
						// checks whether the current page has mousewheel enable
						if (('|'+ self.page.slide_trigger +'|').indexOf('|mousewheel|') == -1 ||
								// and target element is not scrollable
								event.target.getAttribute('data-scrollable') || $(event.target).parents('[data-scrollable]').length)
							return;
						
						// up
						if (
							// ie, opera, safari
							typeof event.originalEvent.wheelDelta != 'undefined' && event.originalEvent.wheelDelta >= 0 ||
							// firefox
							typeof event.originalEvent.detail != 'undefined' && event.originalEvent.detail < 0) {
							self.prev(false, 'user');
						}
						// down
						else {
							self.next(false, 'user');
						}
					});
				}
				
				// bind main events
				$(window).on({
					resize: function() {
						// update size
						self.width = self.dom.width();
						self.height = self.dom.height();
						
						// update width and height of each page
						self.each(function() {
							this.dom.css('height', self.height);
						});
						
						if (self.page) {
							// update container top
							self.dom.css('top', page.position() * self.height * -1);
							// trigger resize
							self.page.onresize();
						}
					},
					
					keyup: function() {
						move(function() {
							var	key = self.keys[event.which || event.keyCode] || null;
							if (key && ('|' + self.page.slide_trigger + '|').indexOf(key[0]) > -1)
								self[key[1]](false, 'user');
						});
					},
					
					mousewheel: mousewheel,
					DOMMouseScroll: mousewheel,
					
					touchstart: function(event) {
						touch.start = event.originalEvent.touches[0].pageY;
					},
					
					touchmove: function(event) {
						move(function() {
							touch.end = event.originalEvent.touches[0].pageY;
							
							// minimum distance
							if (Math.abs(touch.end - touch.start) < 10)
								return;
							
							self[touch.start > touch.end ? 'prev' : 'next'](false, 'user');
						});
					},
					
					orientationchange: function(event) {
						$(window).resize();
					}
				})
				// trigger resize
				.resize();
			}
			// normal mode
			else {
				$(window).on({
					resize: function() {
						// update size
						self.width = self.dom.width();
						self.height = $(document).height();
					},
					// automatically triggered by browser
					scroll: function(event, move) {
						for (var m=window.pageYOffset + (window.innerHeight || (document.documentElement || document).clientHeight) / 2, i=self.pages.length, page; i--;)
							if (m >= (page = self.pages[i]).dom.offset().top)
								break;
						
						// still
						if (page == self.page)
							return;
						
						self.goto(page, true, move === true);
					}
				})
				.resize();
			}
			
			this.trigger('init');
			
			// starts from page X
			this.goto(start, true);
			
			return this;
		}
	};
	
	/**
	 * Page class
	 * @class
	 */
	function Page() {
		this.construct.apply(this, arguments);
	}
	
	Page.prototype = {
		/**
		 * Unique identifier
		 * @var number
		 */
		id: -1,
		
		/**
		 * Page name
		 * @var string
		 */
		name: '',
		
		/**
		 * Autoload flag
		 * @var bool
		 */
		load: false,
		
		/**
		 * Autoload the previous page
		 * @var bool
		 */
		load_prev: false,
		
		/**
		 * Autoload the next page
		 * @var bool
		 */
		load_next: false,
		
		/**
		 * Page data
		 * @var object
		 */
		data: null,
		
		/**
		 * Cache flag
		 * @var bool
		 */
		cache: true,
		
		/**
		 * Start flag
		 * @var bool
		 */
		start: false,
		
		/**
		 * Indexed flag
		 * @var bool
		 */
		index: true,
		
		/**
		 * Page marker
		 * @var string
		 */
		marker: '',
		
		/**
		 * Page marker mask
		 * @var string
		 */
		mask: '',
		
		/**
		 * Matched data from regexp marker
		 * @var array
		 */
		params: null,
		
		/**
		 * Page leave direction
		 * @var string
		 */
		slide: 'vertical',
		
		/**
		 * Page leave triggers
		 * @var string
		 */
		slide_trigger: 'mousewheel|up|down|left|right',
		
		/**
		 * Page leave duration
		 * @var string|number
		 */
		slide_duration: 'normal',
		
		/**
		 * Page content/logic path
		 * @var string
		 */
		url: '',
		
		/**
		 * Page template path
		 * @var string
		 */
		tpl: '',
		
		/**
		 * Page template
		 * @var string
		 */
		template: '',
		
		/**
		 * jQuery selector to extract a content
		 * from external data
		 * @var string
		 */
		extract: null,
		
		/**
		 * Content refresh time in milliseconds
		 * @var int
		 */
		refresh: 0,
		
		/**
		 * Refresh control
		 * @var int
		 */
		refresh_timer: null,
		
		/**
		 * Updates the content independent to be visible
		 * @var bool
		 */
		refresh_hidden: false,
		
		/**
		 * @var Function
		 */
		onload: function() {},
		
		/**
		 * @var Function
		 */
		onenter: function() {},
		
		/**
		 * @var Function
		 */
		onleave: function() {},
		
		/**
		 * @var Function
		 */
		onbeforeenter: function() {},
		
		/**
		 * @var Function
		 */
		onbeforeleave: function() {},
		
		/**
		 * @var Function
		 */
		onresize: function() {},
		
		/**
		 * @var Function
		 */
		onrefresh: function() {},
		
		/**
		 * @var Function
		 */
		oncall: function() {},
		
		/**
		 * @var Function
		 */
		ondrop: function() {},
		
		/**
		 * Load flag
		 * @var bool
		 */
		loaded: false,
		
		/**
		 * User mount flag
		 * @var bool
		 */
		wait: false,
		
		/**
		 * Counter of actions required before initializes the page
		 * @var number
		 */
		required: 0,
		
		/**
		 * Page DOM element
		 * @var object
		 */
		dom: null,
		
		/**
		 * Total page steps
		 * @var number
		 */
		steps: 0,
		
		/**
		 * Current page step
		 * @var number
		 */
		current: 0,
		
		/**
		 * Flip instance
		 * @var Flip
		 */
		flip: null,
		
		/**
		 * Constructor
		 * @return void
		 */
		construct: function() {
			Tools.composite(this, Page);
		},
		
		/**
		 * Marks the page
		 * @param string marker A marker
		 * @return string The marker
		 */
		mark: function(marker) {
			return this.flip.mark(marker);
		},
		
		/**
		 * Finds the page position
		 * @return int The position or -1
		 */
		position: function() {
			for (var i=this.flip.pages.length;;)
				if (this == this.flip.pages[--i])
					break;
			return i;
		},
		
		/**
		 * Go to the previous page
		 * @param bool direct
		 * @param string origin
		 * @return bool TRUE on success, FALSE on failure
		 */
		prev: function(direct, origin) {
			return this.flip.goto(this.position() - 1, direct, origin);
		},
		
		/**
		 * Go to the next page
		 * @param bool direct
		 * @param string origin
		 * @return bool TRUE on success, FALSE on failure
		 */
		next: function(direct, origin) {
			return this.flip.goto(this.position() + 1, direct, origin);
		},
		
		/**
		 * Checks whether the page marker matches the marker given
		 * @return bool
		 */
		match: function(marker) {
			return !!(this.params = this.marker.exec(marker));
		},
		
		/**
		 * Checks whether page has a component
		 * @param string component Component's name
		 * @return bool
		 */
		has: function(component) {
			return component in this.components;
		},
		
		/**
		 * Show/goto this page
		 * @return bool
		 */
		show: function() {
			return this.flip.goto(this);
		},
		
		/**
		 * Mounts the page
		 * @param mixed data Page data
		 * @param string template Page template
		 * @return bool
		 */
		mount: function(data, template) {
			// set data
			if (data)
				this.data = data;
			
			// set template
			if (template)
				this.template = template;
			
			if (this.required > 0)
				return false;
			
			this.dom.html(
				this.template ?
					// with template
					Tools.render(this.template, this.data) :
					// without template
					(typeof this.data == 'object' ? this.data.content : this.data)
			);
			
			if (!this.wait)
				this.loaded = true;
			
			this.preload();
			this.trigger('load');
			this.trigger('init');
			
			return true;
		},
		
		/**
		 * Preload implementation
		 * @return void
		 */
		preload: function() {
			var self = this;
			
			// attach general events
			$('[data-call]', this.dom).on('click.call', function() {
				self.call.apply(self, this.getAttribute('data-call').split(/\s+from\s+/));
			});
			
			$('[data-exit]', this.dom).on('click.exit', function() {
				self.exit();
			});
			
			// page step
			this.steps = this.dom.find('.step').css('height', this.flip.height).length;
		},		
		
		/**
		 * Go to a page step
		 * @param number n A page step
		 * @param number walk
		 * @return bool TRUE on success, FALSE on failure
		 */
		step: function(n, walk) {
			if (walk)
				n = this.current + walk;
			return n > -1 && n < this.steps &&
				this.dom.children().first().animate({marginTop: (this.current = n) * this.flip.height * -1});
		},
		
		/**
		 * Clones the page
		 * @return Page The new page
		 */
		clone: function() {
			var page = $.extend(true, {}, this);
			page.dom = page.dom.clone(false);
			return page;
		},
		
		/**
		 * Fetchs a page content
		 * @param string Content url
		 * @param function callback Callback function
		 * @return void
		 */
		fetch: function(url, callback) {
			var self = this;
			
			if (typeof callback != 'function')
				callback = function() {};
			
			// loads js by require
			if (url.match(/\.js\b/)) {
				var prev = window.page || undefined;
				
				// updates global page reference
				window.page = this;
				
				require([url], function() {
					callback.call(self);
					
					// user mounts the page
					if (!self.wait)
						self.mount();
					
					if (window.page.index == false)
						window.page = prev;
				});
			}
			// otherwise by jQuery
			else {
				$.ajax({
					url: url,
					cache: this.cache,
					success: function(data) {
						callback.call(self);
						self.mount(null, data);
					}
				});
			}
		},
		
		/**
		 * Requires a content before set the page as loaded
		 * @param string url Content url
		 * @return void
		 */
		require: function(url) {
			this.required++;
			this.fetch(url, function() {
				this.required--;
			});
		},
		
		/**
		 * Calls a page
		 * @param mixed page A page name, id or object
		 * @param string from Direction
		 * @return void
		 */
		call: function(page, from) {
			var self = this,
				page = this.flip.get(page),
				cale = null,
				styl = {
					cur: {
						display: 'block',
						position: 'absolute',
						top: self.dom.position().top,
						width: '100%'
					},
					ini: {},
					end: {}
				},
				i = 0;
			
			// direction as array
			from = typeof from == 'undefined' ? ['left'] : from.match(/top|bottom|right|left/g);
			
			for (; i < from.length; i++) {
				if (from[i] == 'left' || from[i] == 'right') {
					from[i] = from[i] == 'left' ? 'right' : 'left';
					styl.cur[from[i]] = '100%';
					styl.ini[from[i]] = '0';
					styl.end[from[i]] = '100%';
				}
				else {
					from[i] = from[i] == 'top' ? -1 : 1;
					styl.ini.top = styl.cur.top;
					styl.end.top = styl.cur.top += this.flip.height * from[i];
				}
			}
			
			page.one('init.call', function() {
				cale = page.clone();
				cale.dom
					.css(styl.cur).appendTo(cale.flip.dom)
					.animate(styl.ini, 'slow');
				cale.exit = function() {
					cale.onbeforeleave();
					cale.dom.animate(styl.end, 'slow', function() {
						cale.onleave();
						cale.dom.remove();
					});
				};
				cale.preload();
			});
			
			page.init();
		},
		
		/**
		 * Initializes the page
		 * @return Page
		 */
		init: function() {
			var self = this, component;
			
			// refresh
			if (this.refresh_timer == null && this.refresh > 0)
				this.refresh_timer = setInterval(function() {
					self.get(true);
				}, this.refresh);
			
			if (this.loaded) {
				this.trigger('init');
				return;
			}
			
			// external content
			if (this.url || this.tpl) {
				this.required += !!this.url + !!this.tpl;
				var dec = function() {this.required--;};
				!this.tpl || this.fetch(this.tpl, dec);
				!this.url || this.fetch(this.url, dec);
			}
			else {
				this.preload();
				this.trigger('load');
				this.trigger('init');
			}
			
			return this;
		},
		
		/**
		 * Executes after leaving the page
		 * @return void
		 */
		exit: function() {
			if (this.refresh > 0 && !this.refresh_hidden)
				this.refresh_timer = clearInterval(this.refresh_timer) || null;
		}
	};
	
	if (typeof require == 'undefined') {
		/**
		 * Scripts loader
		 * @param array deps Dependencies
		 * @param Function callback Callback
		 * @param bool queue Carregamento em fila ou assíncrono
		 */
		window.require = function(list, callback, queue) {
			var head = document.getElementsByTagName('head')[0] || document.documentElement,
				deps = [],
				call;
			
			if (list.length == 0) {
				callback();
				return;
			}
			
			for (var i=0, item; i < list.length && (item = list[i]); i++) {
				if (typeof item == 'string')
					item = {url: item, cache: true};
				else {
					if (typeof item.cache == 'undefined')
						item.cache = true;
				}
				deps.push(item);
			}
			
			function back(dep) {
				// update dependency status to loaded
				dep.status = 2;
				
				for (var i=0, len=deps.length; i < len; i++)
					if (typeof deps[i].status == 'undefined' || deps[i].status !== 2)
						break;
				
				// missing
				if (i != len) {
					// start load next lib
					if (queue)
						load(deps[i]);
				}
				// finished
				else {
					callback.call(self);
				}
			}
			
			// 0 stopped (or undefined)
			// 1 loading
			// 2 loaded
			function load(dep) {
				if (dep.url.match(/\.css$/))
					return;
				
				var node = path();
				
				dep.status = 1;
				
				node.onload = node.onreadystatechange = function() {
					node.onload = node.onreadystatechange = null;
					head.removeChild(node);
					back(dep);
				}
				
				node.src = dep.url;
				
				if (dep.cache == false)
					node.src += (dep.url.indexOf('?') == -1 ? '?' : '&') + Math.random().toString().substr(5);
				
				head.appendChild(node);
			}
			
			function path() {
				var node = document.createElement('script');
				//node.async = false;
				node.type = 'text/javascript';
				node.charset = 'utf-8';
				node.async = true;
				return node;
			}
			
			// init
			(queue ?
				// queue model
				function() {
					load(deps[0]);
				} :
				// unordered model
				function() {
					for (var i=0, len=deps.length; i < len; load(deps[i++]));
				})();
		}
	}
	
	/**
	 * Flip components
	 * @var object
	 */
	Flip.components = {};
	
	/**
	 * Flip navigation component
	 * @param Flip flip
	 */
	Flip.components.navigation = function(flip) {
		this.flip = flip;
		
		// event
		Tools.composite.event(this);
		
		// shortcut
		flip.navigation = this;
		
		// base dom
		this.dom = $(document.createElement('div')).addClass('flip-navigation').prependTo(this.flip.dom.parent());
	};
	
	Flip.components.navigation.prototype = {
		items: {},
		
		current: null,
		
		update: function(page) {
			page = typeof page == 'undefined' ? this.flip.page : this.flip.get(page);
			
			if (!page || this.flip.locked || typeof this.items[page.id] == 'undefined' || this.current == this.items[page.id])
				return false;
			
			// is not currently displayed
			if (page != this.flip.page)
				page.show();
			
			if (this.current)
				this.current.removeClass('active');
			
			this.current = this.items[page.id].addClass('active');
			
			return true;
		},
		
		mount: function() {
			this.items = {};
			this.dom.empty();
			for (var pages=this.flip.pages, list=$(document.createElement('ol')).appendTo(this.dom), i=0; i < pages.length; i++)
				if (typeof pages[i].navigation == 'undefined' || pages[i].navigation)
					this.items[pages[i].id] = $(document.createElement('li'))
						.html(pages[i].navigation_label ? '<a><b>'+ pages[i].navigation_label +'</b></a>' : '')
						.appendTo(list).on('click', {i: i}, function(event) {
							pages[event.data.i].flip.navigation.update(pages[event.data.i]);
						});
		},
		
		init: function() {
			// creates the structure
			this.mount();
			
			// updates the navigation on page add or remove
			this.flip.on('update', function() {
				this.navigation.mount();
			});
			
			// updates the active item on flip
			this.flip.on('flip', function() {
				this.navigation.update();
			});
		}
	};
	
	/**
	 * Page components
	 */
	Page.components = {};
	
	/**
	 * General tools
	 */
	var Tools = {
		/**
		 * Fix properties type and value
		 * @class static
		 */
		attr: {
			index: 'bool',
			start: 'bool',
			cache: 'bool',
			load: 'bool',
			onload: 'fn',
			load_prev: 'bool',
			load_next: 'bool',
			slide_duration: 'time',
			onenter: 'fn',
			onleave: 'fn',
			onbeforeenter: 'fn',
			onbeforeleave: 'fn',
			refresh: 'time',
			refresh_hidden: 'bool',
			onrefresh: 'fn',
			
			map: function(obj, prop, value) {
				switch (this[prop]) {
					case 'bool':
						value = value == 'true' || value == '1';
						break;
					
					case 'time':
						value = {slow: 600, normal: 400, fast: 200}[value] || parseInt(value);
						break;
					
					case 'fn':
						var x = value;
						value = function() {
							window[x].apply(this, arguments);
						};
						break;
					
					default:
						if (value == 'true' || value == 'false')
							value = value == 'true';
						break;
				}
				
				obj[prop] = value;
			}
		},
		
		/**
		 * Timer
		 * @param string name Control name
		 * @param function func Callback function
		 * @param int time Time in milliseconds
		 * @param bool ever Intervaled
		 * @param bool orid Override
		 * @return bool
		 */
		time: function(name, func, time, ever, orid) {
			// prevents execute the function before the timeout
			if (typeof this.time[name] != 'undefined' && this.time[name] && !ever && !orid)
				return false;
			var ctrl = ever ? 'Interval' : 'Timeout';
			if (typeof this.time[name] !== 'undefined')
				this.time[name] = window['clear' + ctrl](this.time[name]);
			if (!time)
				return func();
			this.time[name] = window['set' + ctrl](function() {
				func();
				Tools.time[name] = false;
				try {
					delete Tools.time[name];
				}
				catch (e) {}
			}, time);
			return true;
		},
		
		/**
		 * Render function
		 * @param string template Template
		 * @param object data Data
		 * @return string
		 */
		render: function(template, data) {
			if (typeof Mustache !== 'undefined')
				return Mustache.to_html(template, data);
			else if (typeof Handlebars != 'undefined')
				return Handlebars.compile(template)(data);
			return template;
		},
		
		/**
		 * Object composition
		 * @param object target Object target
		 * @param object source Source
		 * @return void
		 */
		composite: function(target, source) {
			Tools.composite.event(target, source);
			Tools.composite.components(target, source);
		}
	};
	
	/**
	 * Events composition
	 */
	Tools.composite.event = function(target) {
		target.event = {};
		
		target.on = function(event, callback) {
			if (typeof this.event[event] == 'undefined')
				this.event[event] = [];
			this.event[event].push(callback);
		};
		
		target.off = function(event, callback) {
			if (event in this.event) {
				if (typeof callback != 'undefined') {
					for (var temp=[], i=0; i < this.event[event].length; i++)
						if (this.event[event][i] !== callback)
							temp.push(this.event[event][i]);
					this.event[event] = temp;
				}
				else {
					delete this.event[event];
				}
			}
		};
		
		target.trigger = function(type, args) {
			var event, i;
			
			if (typeof args == 'undefined')
				args = [];
			
			// queue
			for (event in this.event)
				if ((event + '.').indexOf(type + '.') === 0)
					for (event = this.event[event], i=0; i < event.length; event[i++].apply(this, args));
			
			// method
			if (typeof this['on' + type] == 'function')
				this['on' + type]();
		};
		
		target.one = function(event, callback) {
			var action = function() {
				// dispatch original callback
				callback.apply(this, arguments);
				this.off(event, action);
			};
			this.on(event, action);
		};
	};
	
	/**
	 * Components composition
	 */
	Tools.composite.components = function(target, source) {
		target.components = {};
		
		// enable components
		for (var component in source.components)
			target.components[component] = new source.components[component](target);
		
		target.one('init', function() {
			// initialize each component
			for (var component in this.components)
				if (typeof target.components[component].init == 'function')
					target.components[component].init();
		});
	};
	
	// public interface
	flip.name = 'flip.js';
	flip.version = '0.2';
	flip.Pages = Flip;
	flip.Page = Page;
	flip.require = require;
	flip.tools = Tools;
});