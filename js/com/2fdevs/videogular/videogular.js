/**
 * @license Videogular v0.4.0 http://videogular.com
 * Two Fucking Developers http://twofuckingdevelopers.com
 * License: MIT
 */
"use strict";
angular.module("com.2fdevs.videogular", ["ngSanitize"])
	.constant("VG_STATES", {
		PLAY: "play",
		PAUSE: "pause",
		STOP: "stop"
	})
	.service("VG_UTILS", function () {
		this.fixEventOffset = function ($event) {
			/**
			 * There's no offsetX in Firefox, so we fix that.
			 * Solution provided by Jack Moore in this post:
			 * http://www.jacklmoore.com/notes/mouse-position/
			 * @param $event
			 * @returns {*}
			 */
			if (navigator.userAgent.match(/Firefox/i)) {
				var style = $event.currentTarget.currentStyle || window.getComputedStyle($event.target, null);
				var borderLeftWidth = parseInt(style['borderLeftWidth'], 10);
				var borderTopWidth = parseInt(style['borderTopWidth'], 10);
				var rect = $event.currentTarget.getBoundingClientRect();
				var offsetX = $event.clientX - borderLeftWidth - rect.left;
				var offsetY = $event.clientY - borderTopWidth - rect.top;

				$event.offsetX = offsetX;
				$event.offsetY = offsetY;
			}

			return $event;
		};
		/**
		 * Inspired by Paul Irish
		 * https://gist.github.com/paulirish/211209
		 * @returns {number}
		 */
		this.getZIndex = function () {
			var zIndex = 1;

			angular.element('*')
				.filter(function () {
					return angular.element(this).css('zIndex') !== 'auto';
				})
				.each(function () {
					var thisZIndex = parseInt(angular.element(this).css('zIndex'));
					if (zIndex < thisZIndex) zIndex = thisZIndex + 1;
				});

			return zIndex;
		};

		this.secondsToDate = function(seconds) {
			var result = new Date();
			result.setTime(seconds * 1000);
			return result;
		};

		// Very simple mobile detection, not 100% reliable
		this.isMobileDevice = function () {
			return (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf("IEMobile") !== -1);
		};

		this.isiOSDevice = function () {
			return (navigator.userAgent.match(/iPhone/i) || navigator.userAgent.match(/iPod/i) || navigator.userAgent.match(/iPad/i));
		};
	})
	.run(["$window", "VG_UTILS",
		function ($window, VG_UTILS) {
			// Native fullscreen polyfill
			var fullScreenAPI;
			var APIs = {
				w3: {
					enabled: "fullscreenEnabled",
					element: "fullscreenElement",
					request: "requestFullscreen",
					exit: "exitFullscreen",
					onchange: "fullscreenchange",
					onerror: "fullscreenerror"
				},
				newWebkit: {
					enabled: "webkitFullscreenEnabled",
					element: "webkitFullscreenElement",
					request: "webkitRequestFullscreen",
					exit: "webkitExitFullscreen",
					onchange: "webkitfullscreenchange",
					onerror: "webkitfullscreenerror"
				},
				oldWebkit: {
					enabled: "webkitIsFullScreen",
					element: "webkitCurrentFullScreenElement",
					request: "webkitRequestFullScreen",
					exit: "webkitCancelFullScreen",
					onchange: "webkitfullscreenchange",
					onerror: "webkitfullscreenerror"
				},
				moz: {
					enabled: "mozFullScreen",
					element: "mozFullScreenElement",
					request: "mozRequestFullScreen",
					exit: "mozCancelFullScreen",
					onchange: "mozfullscreenchange",
					onerror: "mozfullscreenerror"
				},
				ios: {
					enabled: "webkitFullscreenEnabled",
					element: "webkitFullscreenElement",
					request: "webkitEnterFullscreen",
					exit: undefined,
					onexit: "webkitendfullscreen",
					onchange: "webkitfullscreenchange",
					onerror: "webkitfullscreenerror"
				},
				ms: {
					enabled: "msFullscreenEnabled",
					element: "msFullscreenElement",
					request: "msRequestFullscreen",
					exit: "msExitFullscreen",
					onchange: "msfullscreenchange",
					onerror: "msfullscreenerror"
				}
			};

			for (var browser in APIs) {
				if (APIs[browser].enabled in document) {
					fullScreenAPI = APIs[browser];
					fullScreenAPI.isFullScreen = function () {
						return (document[this.element] != null);
					};

					break;
				}
			}

			// Override APIs on iOS
			if (VG_UTILS.isiOSDevice()) {
				fullScreenAPI = APIs.ios;
				fullScreenAPI.isFullScreen = function () {
					return (document[this.element] != null);
				};
			}

			angular.element($window)[0].fullScreenAPI = fullScreenAPI;
		}
	])
	/**
	 * @ngdoc directive
	 * @name com.2fdevs.videogular.videogular:videogular
	 * @restrict E
	 * @description
	 * Main directive that must wrap a &lt;video&gt; tag and all plugins.
	 *
	 * &lt;video&gt; tag usually will be above plugin tags, that's because plugins should be in a layer over the &lt;video&gt;.
	 *
	 * You can customize `videogular` with these attributes:
	 *
	 * @param {string} vgTheme String with a scope name variable. This directive will inject a CSS link in the header of your page.
	 * **This parameter is required.**
	 *
	 * @param {boolean or string} [autoPlay=false] vgAutoplay Boolean value or a String with a scope name variable to auto start playing video when it is initialized.
	 *
	 * **This parameter is disabled in mobile devices** because user must click on content to prevent consuming mobile data plans.
	 *
	 * @param {function} vgComplete Function name in controller's scope to call when video have been completed.
	 * @param {function} vgUpdateVolume Function name in controller's scope to call when volume changes. Receives a param with the new volume.
	 * @param {function} vgUpdateTime Function name in controller's scope to call when video playback time is updated. Receives two params with current time and duration in milliseconds.
	 * @param {function} vgUpdateState Function name in controller's scope to call when video state changes. Receives a param with the new state. Possible values are "play", "stop" or "pause".
	 * @param {function} vgPlayerReady Function name in controller's scope to call when video have been initialized. Receives a param with the videogular API.
	 * @param {function} vgChangeSource Function name in controller's scope to change current video source. Receives a param with the new video.
	 * This is a free parameter and it could be values like "new.mp4", "320" or "sd". This will allow you to use this to change a video or video quality.
	 * This callback will not change the video, you should do that by updating your sources scope variable.
	 *
	 */
	.directive(
	"videogular",
	["$window", "VG_STATES", "VG_UTILS", function ($window, VG_STATES, VG_UTILS) {
		return {
			restrict: "E",
			scope: {
				theme: "=vgTheme",
				autoPlay: "=vgAutoplay",
				vgComplete: "&",
				vgUpdateVolume: "&",
				vgUpdateTime: "&",
				vgUpdateState: "&",
				vgPlayerReady: "&",
				vgChangeSource: "&"
			},
			controller: ['$scope', '$timeout', function ($scope, $timeout) {
				var currentTheme = null;
				var isFullScreenPressed = false;
				var isMetaDataLoaded = false;
				var vg = this;

				var vgCompleteCallBack = $scope.vgComplete();
				var vgUpdateVolumeCallBack = $scope.vgUpdateVolume();
				var vgUpdateTimeCallBack = $scope.vgUpdateTime();
				var vgUpdateStateCallBack = $scope.vgUpdateState();
				var vgPlayerReadyCallBack = $scope.vgPlayerReady();
				var vgChangeSourceCallBack = $scope.vgChangeSource();

				// PUBLIC $API
				this.onVideoReady = function (evt, target) {
                    // Here we're in the video scope, we can't use 'this.'
					$scope.API.isReady = true;
					$scope.API.currentState = VG_STATES.STOP;

					isMetaDataLoaded = true;

					if ($scope.vgPlayerReady()) {
						vgPlayerReadyCallBack = $scope.vgPlayerReady();
						vgPlayerReadyCallBack(vg);
					}

					if ($scope.autoPlay && !VG_UTILS.isMobileDevice() || $scope.API.currentState === VG_STATES.PLAY) {
						$timeout(function () {
							vg.play();
						})
					}
				};

				this.onUpdateTime = function (event) {
					$scope.API.currentTime = VG_UTILS.secondsToDate(event.target.currentTime);
					$scope.API.totalTime = VG_UTILS.secondsToDate(event.target.duration);
					$scope.API.timeLeft = VG_UTILS.secondsToDate(event.target.duration - event.target.currentTime);

					if ($scope.vgUpdateTime()) {
						vgUpdateTimeCallBack = $scope.vgUpdateTime();
						vgUpdateTimeCallBack(event.target.currentTime, event.target.duration);
					}

					$scope.$apply();
				};

				this.$on = function () {
					$scope.$on.apply($scope, arguments);
				};

				this.isPlayerReady = function () {
					return $scope.API.isReady;
				};

				this.seekTime = function (value, byPercent) {
					var second;
					if (byPercent) {
						second = value * $scope.API.videoElement[0].duration / 100;
                        $scope.API.videoElement[0].currentTime = second;
					}
					else {
						second = value;
                        $scope.API.videoElement[0].currentTime = second;
					}

					$scope.API.currentTime = VG_UTILS.secondsToDate(second);
				};

				this.playPause = function () {
                    if ($scope.API.videoElement[0].paused) {
						this.play();
					}
					else {
						this.pause();
					}
				};

				this.setState = function (newState) {
					if (newState && newState != $scope.API.currentState) {
						if ($scope.vgUpdateState()) {
							vgUpdateStateCallBack = $scope.vgUpdateState();
							vgUpdateStateCallBack(newState);
						}

						$scope.API.currentState = newState;
					}

					return $scope.API.currentState;
				};

				this.play = function () {
                    $scope.API.videoElement[0].play();
					this.setState(VG_STATES.PLAY);
				};

				this.pause = function () {
                    $scope.API.videoElement[0].pause();
					this.setState(VG_STATES.PAUSE);
				};

				this.stop = function () {
                    $scope.API.videoElement[0].pause();
                    $scope.API.videoElement[0].currentTime = 0;
					this.setState(VG_STATES.STOP);
				};

				this.toggleFullScreen = function () {
					// There is no native full screen support
					if (!angular.element($window)[0].fullScreenAPI) {
						if ($scope.API.isFullScreen) {
							this.videogularElement.removeClass("fullscreen");
							this.videogularElement.css("z-index", 0);
						}
						else {
							this.videogularElement.addClass("fullscreen");
							this.videogularElement.css("z-index", VG_UTILS.getZIndex());
						}

						$scope.API.isFullScreen = !$scope.API.isFullScreen;
					}
					// Perform native full screen support
					else {
						if (angular.element($window)[0].fullScreenAPI.isFullScreen()) {
							if (!VG_UTILS.isMobileDevice()) {
								document[angular.element($window)[0].fullScreenAPI.exit]();
							}
						}
						else {
							// On mobile devices we should make fullscreen only the video object
							if (VG_UTILS.isMobileDevice()) {
								// On iOS we should check if user pressed before fullscreen button
								// and also if metadata is loaded
								if (VG_UTILS.isiOSDevice()) {
									if (isMetaDataLoaded) {
										this.enterElementInFullScreen(this.videoElement[0]);
									}
									else {
										isFullScreenPressed = true;
										this.play();
									}
								}
								else {
									this.enterElementInFullScreen(this.videoElement[0]);
								}
							}
							else {
								this.enterElementInFullScreen(this.elementScope[0]);
							}
						}
					}
				};

				this.enterElementInFullScreen = function (element) {
					element[angular.element($window)[0].fullScreenAPI.request]();
				};

				this.changeSource = function (newValue) {
					if ($scope.vgChangeSource()) {
						vgChangeSourceCallBack = $scope.vgChangeSource();
						vgChangeSourceCallBack(newValue);
					}
				};

				this.setVolume = function (newVolume) {
					if ($scope.vgUpdateVolume()) {
						vgUpdateVolumeCallBack = $scope.vgUpdateVolume();
						vgUpdateVolumeCallBack(newVolume);
					}

                    $scope.API.videoElement[0].volume = newVolume;
					$scope.API.volume = newVolume;
				};

				this.updateTheme = function (value) {
					if (currentTheme) {
						// Remove previous theme
						var links = document.getElementsByTagName("link");
						for (var i = 0, l = links.length; i < l; i++) {
							if (links[i].outerHTML.indexOf(currentTheme) >= 0) {
								links[i].parentNode.removeChild(links[i]);
							}
						}
					}

					if (value) {
						var headElem = angular.element(document).find("head");
						headElem.append("<link rel='stylesheet' href='" + value + "'>");

						currentTheme = value;
					}
				};

				this.onStartBuffering = function (event) {
					$scope.API.isBuffering = true;
				};

				this.onStartPlaying = function (event) {
					// Chrome fix: Chrome needs to update the video tag size or it will show a white screen
					event.target.width++;
					event.target.width--;

					$scope.API.isBuffering = false;
				};

				this.onComplete = function (event) {
					if ($scope.vgComplete()) {
						vgCompleteCallBack = $scope.vgComplete();
						vgCompleteCallBack();
					}

					vg.setState(VG_STATES.STOP);
					$scope.API.isCompleted = true;
					$scope.$apply();
				};

				// FUNCTIONS NOT AVAILABLE THROUGH API
				$scope.API = this;

				$scope.init = function () {
					$scope.API.isReady = false;
					$scope.API.isCompleted = false;
					$scope.API.currentTime = 0;
					$scope.API.totalTime = 0;
					$scope.API.timeLeft = 0;

					vg.updateTheme($scope.theme);
					$scope.addBindings();

					if (angular.element($window)[0].fullScreenAPI) {
						document.addEventListener(angular.element($window)[0].fullScreenAPI.onchange, $scope.onFullScreenChange);
					}
				};

				$scope.addBindings = function () {
					$scope.$watch("theme", function (newValue, oldValue) {
						if (newValue != oldValue) {
							vg.updateTheme(newValue);
						}
					});

					$scope.$watch("autoPlay", function (newValue, oldValue) {
						if (newValue != oldValue) {
							if (newValue) vg.play();
						}
					});
				};

				$scope.onFullScreenChange = function (event) {
					$scope.API.isFullScreen = angular.element($window)[0].fullScreenAPI.isFullScreen();
					$scope.$apply();
				};

				$scope.init();
			}],
			link: {
				pre: function (scope, elem, attr, controller) {
					controller.videogularElement = elem;
					controller.elementScope = angular.element(elem);
				}
			}
		}
	}
	])
	.directive("vgVideo",
	["$compile", function ($compile, $timeout) {
		return {
			restrict: "E",
			require: "^videogular",
			scope: {
				vgSrc: "=",
                vgNativeControls: "@"
			},
			link: function (scope, elem, attr, API) {
                var videoTagText;

                if (scope.vgNativeControls == "true") {
                    videoTagText = '<video vg-source="vgSrc" controls></video>'
                }
                else {
                    videoTagText = '<video vg-source="vgSrc"></video>';
                }

                API.videoElement = angular.element(videoTagText);
				var compiled = $compile(API.videoElement)(scope);

                API.videoElement[0].addEventListener("loadedmetadata", API.onVideoReady, false);
                API.videoElement[0].addEventListener("waiting", API.onStartBuffering, false);
                API.videoElement[0].addEventListener("ended", API.onComplete, false);
                API.videoElement[0].addEventListener("playing", API.onStartPlaying, false);
                API.videoElement[0].addEventListener("timeupdate", API.onUpdateTime, false);

                elem.append(compiled);
			}
		}
	}
	])
	.directive("vgSource",
	[function () {
		return {
			restrict: "A",
			link: {
				pre: function (scope, elem, attr) {
					var element = elem;
					var sources;
					var canPlay;

					function changeSource() {
						canPlay = "";

						// It's a cool browser
						if (element[0].canPlayType) {
							for (var i = 0, l = sources.length; i < l; i++) {
								canPlay = element[0].canPlayType(sources[i].type);

								if (canPlay == "maybe" || canPlay == "probably") {
									element.attr("src", sources[i].src);
									element.attr("type", sources[i].type);
									break;
								}
							}
						}
						// It's a crappy browser and it doesn't deserve any respect
						else {
							// Get H264 or the first one
							element.attr("src", sources[0].src);
							element.attr("type", sources[0].type);
						}

						if (canPlay == "") {
							// Throw error
						}
					}

					scope.$watch(attr.vgSource, function (newValue, oldValue) {
						if ((!sources || newValue != oldValue) && newValue) {
							sources = newValue;
							changeSource();
						}
					});
				}
			}
		}
	}
	]);