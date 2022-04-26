"use strict"; // eslint-disable-line strict
(function () {
    /**
     * Vimium C 鐢熷懡鍛ㄦ湡鍥炶皟鍑芥暟锛屽湪 https://github.com/gdh1995/vimium-c/blob/master/content/injected_end.ts 涓皟鐢�
     *
     * @argument {number} action_code 1: "initing", 2: "complete", 3: "destroy"
     */
    const lifetimeHandler = (action_code) => {
        if (action_code === 2) {
            // 鍒濆鍖栧畬鎴�
            const api = window.VApi;
            const oldScroll = api.$;
            if (typeof oldScroll === "function") {
                /**
                 * 鎺ョ婊氬姩鍛戒护锛岀敤浜庡叏灞忔ā寮忎笅绔嬪嵆缈婚〉锛堝拷鐣ュ钩婊戞粴鍔級
                 */
                api.$ = (element, di, amount) => {
                    if (
                        element.id === "viewerContainer" &&
                        element.classList.contains("pdfPresentationMode")
                    ) {
                        element.dispatchEvent(
                            new WheelEvent("wheel", {
                                bubbles: true,
                                cancelable: true,
                                composed: true,
                                deltaY: Math.sign(amount) * 120,
                            })
                        );
                    } else {
                        oldScroll.call(this, element, di, amount);
                    }
                };
            }
            /**
             * 杩斿洖 PDF 鏂囦欢鐨� URL锛岀敤浜庡鍒剁綉椤靛湴鍧€绛夊懡浠�
             */
            api.u = () => {
                const file = new URLSearchParams(location.search).get("file");
                return file || location.href;
            };
        } else if (action_code === 3) {
            // 鍋滄
            window.removeEventListener("vimiumMark", onMark, true);
        }
    };

    /**
     * 璁剧疆鎴栬€呰幏鍙栤€滄枃妗ｆ粴鍔ㄤ綅缃€濓紝鍦� https://github.com/gdh1995/vimium-c/blob/master/content/marks.ts#L10 涓皟鐢�
     *
     * @argument {CustomEvent} event
     */
    const onMark = (event) => {
        const channelElement = event.relatedTarget;
        const box = channelElement && document.getElementById("viewerContainer");
        event.stopImmediatePropagation();
        if (!box) {
            return;
        }
        const str = channelElement.textContent;
        if (str) {
            // 瀵瑰簲鍛戒护 Marks.activate
            const mark = str.split(",");
            const position = [~~mark[0], ~~mark[1]];
            if (position[0] > 0 || position[1] > 0) {
                box.scrollTo(position[0], position[1]);
                channelElement.textContent = "";
                event.preventDefault();
            }
        } else {
            // 瀵瑰簲鍛戒护 Marks.activateCreate
            channelElement.textContent = [box.scrollLeft, box.scrollTop];
        }
    };

    const IDOnFirefox = "vimium-c@gdh1995.cn";
    const IDOnEdge = "aibcglbfblnogfjhbcmmpobjhnomhcdo";
    const IDOnChrome = "hfjbmagddngcpeloejdejnfgbamkjaeg";

    browser.storage.sync.get("vimiumExtensionInjector").then((result) => {
        let injector = result.vimiumExtensionInjector;
        if (injector === "nul" || injector === "/dev/null") {
            return;
        }
        const IsEdge = /\sEdg\//.test(navigator.appVersion)
        const IsFirefox = typeof InstallTrigger !== "undefined"
        const useFixedInjector = !!injector
        if (!injector) {
            injector = IsFirefox ? IDOnFirefox : IsEdge ? IDOnEdge : IDOnChrome;
        }
        if (injector.includes("://") && injector.includes("/", injector.indexOf("://") + 3)) {
            inject(injector);
            return;
        }
        let expectedExtId;
        try {
            if (injector.includes("://")) {
                expectedExtId = new URL(injector).hostname;
            } else {
                expectedExtId = injector;
            }
        } catch (_e) {
            return;
        }
        let q = browser.runtime.sendMessage(expectedExtId, { handler: "id" });
        let extIdInUse = expectedExtId;
        if (!useFixedInjector && IsEdge) {
            q = q.catch(() => {
                extIdInUse = IDOnChrome
                return browser.runtime.sendMessage(extIdInUse, { handler: "id" })
            })
        }
        q.then((response) => {
            if (!response || !response.injector || typeof response.injector !== "string") {
                if (response === false) {
                    console.log("Connection to the extension named %o was refused.", expectedExtId);
                }
                return;
            }
            console.log(
                `Successfully connected to ${extIdInUse}: %o (version ${response.version}).`,
                response.name
            );
            inject(response.injector);
        }, () => {});
    });

    const inject = (url) => {
        const script = document.createElement("script");
        script.src = url;
        script.async = true;
        script.onload = () => {
            // 鍦� https://github.com/gdh1995/vimium-c/blob/master/lib/injector.ts#L87 澶勫畾涔�
            const injector = window.VimiumInjector;
            if (injector) {
                injector.cache
                    ? lifetimeHandler(2, "complete")
                    : (injector.callback = lifetimeHandler);
                window.addEventListener("vimiumMark", onMark, true);
            }
        };
        document.head.appendChild(script);
    };
})();
