/**
 * 前台歌單顯示系統
 * 實現功能：
 * 1. 實時顯示已唱過的歌曲和現正演唱的歌曲
 * 2. 多種顯示模式：
 *    - 情況A: 無現正演唱、歌單短於顯示範圍
 *    - 情況B: 無現正演唱、歌單長於顯示範圍(更早啟動滾動，底部預留更多空間)
 *    - 情況C: 有現正演唱、歌單短於顯示範圍
 *    - 情況D: 有現正演唱、歌單長於顯示範圍(優化底部空間)
 *    - 情況E: 僅有現正演唱，沒有已唱過的曲目(隱藏框架)
 *    - 情況F: 無現正演唱，也沒有已唱過的曲目(現正演唱位置上移)
 */
document.addEventListener('DOMContentLoaded', () => {
    // DOM 元素
    const sungSongsList = document.getElementById('sungSongsList');
    const scrollableArea = document.querySelector('.scrollable-area');
    const currentSong = document.getElementById('currentSong');
    const songList = document.querySelector('.song-list');
    const listFrame = document.querySelector('.list-frame');
    const listFrameDecoration = document.querySelector('.list-frame-decoration'); // 新增：獲取裝飾元素

    // 配置參數
    const CONFIG = {
        scrollSpeed: 1,       // 滾動速度 (數值越小越慢)
        scrollPauseTime: 1000,  // 滾動到頂部或底部時暫停的時間(毫秒)
        updateInterval: 500,    // 輪詢檢查更新的間隔(毫秒)
        scrollInterval: 50,     // 滾動更新頻率(毫秒)
        currentSongDefaultHeight: 86, // 現正演唱歌曲的預設高度
        extraSpaceBuffer: 30,   // 額外緩衝空間
        scrollVisibilityOffset: 180,  // 檢查歌曲可見性的偏移量 - 增加到180px更敏感地檢測需要滾動的情況
        safetyMargin: 80,       // 預留安全邊距，確保文字不被切斷 - 增加到80px
        naturalModeBottomPadding: 40, // 自然模式下的底部內縮空間
        extraScrollSpace: 20,   // 確保完整滾動所有內容的額外空間
        bottomScrollBuffer: 5,  // 滾動到底部時的額外緩衝距離 - 減少到5px讓底部空間更緊湊
        onlyCurrentSongTopMargin: 40 // 情況E: 僅有現正演唱時歌曲的上移距離
    };

    // 狀態管理
    const STATE = {
        scrollDirection: 1,     // 1 = 向下滾動, -1 = 向上滾動
        scrollPosition: 0,      // 當前滾動位置
        scrollInterval: null,   // 滾動的計時器
        isPaused: false,        // 是否暫停滾動
        lastSungSongs: '',      // 上一次的歌單
        lastCurrentSong: '',    // 上一次的現正演唱歌曲
        displayMode: 'natural', // 'natural' 或 'fixed' 或 'empty' 或 'only-current'
        resizeTimeout: null     // 用於處理 resize 事件的 debounce
    };

    /**
     * 更新顯示
     * 檢查資料是否有變化，只有在變化時才更新UI
     */
    function updateDisplay() {
        const sungSongs = localStorage.getItem('sungSongs') || '';
        const currentSongText = localStorage.getItem('currentSong') || '';
        
        // 只有在資料變化時才更新界面
        if (sungSongs !== STATE.lastSungSongs || currentSongText !== STATE.lastCurrentSong) {
            // 更新狀態
            STATE.lastSungSongs = sungSongs;
            STATE.lastCurrentSong = currentSongText;
            
            // 更新歌單
            updateSongList(sungSongs);
            
            // 更新現正演唱歌曲
            updateCurrentSong(currentSongText);
            
            // 延遲一點點時間以確保 DOM 更新完成後再調整顯示模式
            setTimeout(() => {
                // 調整顯示模式
                adjustDisplayMode();
                
                // 新增：更新裝飾元素位置
                updateDecorationPosition();
            }, 50);
        }
    }
    
    /**
     * 更新已唱過的歌單列表
     * @param {string} sungSongs - 已唱過的歌曲字符串
     */
    function updateSongList(sungSongs) {
        sungSongsList.innerHTML = '';
        const allSongs = sungSongs.split('\n').filter(song => song.trim() !== '');
        
        let counter = 1;
        allSongs.forEach((song) => {
            const li = document.createElement('li');
            const numberSpan = document.createElement('span');
            const textSpan = document.createElement('span');

            numberSpan.classList.add('song-number');
            textSpan.classList.add('song-text');

            if (song.startsWith('//')) {
                li.classList.add('special-format');
                numberSpan.textContent = '';
                textSpan.innerHTML = insertZeroWidthSpace(song.substring(2).trim());
            } else {
                numberSpan.textContent = counter;
                textSpan.innerHTML = insertZeroWidthSpace(song.trim());
                counter++;
            }

            li.appendChild(numberSpan);
            li.appendChild(textSpan);
            sungSongsList.appendChild(li);
        });
    }
    
    /**
     * 更新現正演唱的歌曲
     * @param {string} currentSongText - 現正演唱的歌曲文本
     */
    function updateCurrentSong(currentSongText) {
        // 確保獲取正確的 ECG 容器元素
        const ecgContainer = document.getElementById('ecgContainer');
        
        // 加入調試訊息
        console.log('更新現正演唱歌曲:', currentSongText);
        console.log('ECG 容器元素:', ecgContainer);
        
        if (currentSongText.trim() !== '') {
            currentSong.innerHTML = `
                <span class="song-number"></span>
                <span class="song-text">${insertZeroWidthSpace(currentSongText.trim())}</span>
                <span class="now-singing"></span>
            `;
            currentSong.style.display = 'flex';
            
            // 顯示 ECG 容器
            if (ecgContainer) {
                ecgContainer.classList.add('ecg-visible');
                console.log('ECG 顯示狀態已設置為可見');
            }
        } else {
            currentSong.style.display = 'none';
            
            // 隱藏 ECG 容器
            if (ecgContainer) {
                ecgContainer.classList.remove('ecg-visible');
                console.log('ECG 顯示狀態已設置為隱藏');
            }
        }
        
        // 強制重新計算版面
        setTimeout(() => {
            if (ecgContainer && currentSongText.trim() !== '') {
                console.log('ECG 最終可見性狀態:', window.getComputedStyle(ecgContainer).display);
            }
            
            // 新增：更新裝飾元素位置
            updateDecorationPosition();
        }, 100);
    }

    /**
     * 在文本中插入零寬空格，優化顯示
     * @param {string} text - 需處理的文本
     * @returns {string} - 處理後的文本
     */
    function insertZeroWidthSpace(text) {
        return text.split('').join('&#8203;');
    }

    /**
     * 獲取現正演唱歌曲的實際高度
     * @returns {number} 實際高度(像素)
     */
    function getCurrentSongHeight() {
        if (currentSong.style.display === 'none') {
            return 0;
        }
        
        // 確保獲取真實高度，包括內邊距、邊框和外邊距
        const style = window.getComputedStyle(currentSong);
        const height = currentSong.offsetHeight;
        const marginTop = parseInt(style.marginTop, 10) || 0;
        const marginBottom = parseInt(style.marginBottom, 10) || 0;
        
        return height + marginTop + marginBottom;
    }
    
    /**
     * 獲取最大允許的框架高度 (視窗高度的限制)
     * @returns {number} 最大高度(像素)
     */
    function getMaxFrameHeight() {
        // 獲取 CSS 中定義的 max-height
        const style = window.getComputedStyle(listFrame);
        const maxHeightCss = style.maxHeight;
        
        if (maxHeightCss && maxHeightCss !== 'none') {
            if (maxHeightCss.includes('calc')) {
                // 簡單處理 calc(100vh - 200px) 這種情況
                return window.innerHeight - 200;
            } else {
                return parseInt(maxHeightCss, 10);
            }
        }
        
        // 預設值
        return window.innerHeight - 200;
    }

    /**
     * 新增：更新裝飾元素位置
     * 根據 list-frame 的實際位置和尺寸來調整裝飾元素
     */
    function updateDecorationPosition() {
        if (!listFrameDecoration || !listFrame) return;
        
        // 根據顯示模式決定裝飾元素行為
        if (STATE.displayMode === 'only-current-mode') {
            // 如果框架被隱藏，也隱藏裝飾元素
            listFrameDecoration.style.opacity = '0';
            listFrameDecoration.style.visibility = 'hidden';
        } else {
            // 確保裝飾元素可見
            listFrameDecoration.style.opacity = '1';
            listFrameDecoration.style.visibility = 'visible';
            
            // 獲取框架的位置和尺寸
            const frameRect = listFrame.getBoundingClientRect();
            const parentRect = listFrame.parentElement.getBoundingClientRect();
            
            // 計算相對於父元素的位置
            const relativeRight = frameRect.right - parentRect.left;
            const relativeBottom = frameRect.bottom - parentRect.top;
            
            // 設置裝飾元素位置
            // 調整右側位置 (保持在框架右側)
            listFrameDecoration.style.right = `${parentRect.right - frameRect.right - 40}px`;
            
            // 調整底部位置 (保持在框架底部並突出)
            // 使用 transform 而不是 bottom 屬性，以確保定位更準確
            const bottomOffset = relativeBottom - 100;
            listFrameDecoration.style.top = `${bottomOffset}px`;
            listFrameDecoration.style.transform = 'translateY(0)';
            
            console.log('更新裝飾元素位置:', {
                frameRight: frameRect.right,
                frameBottom: frameRect.bottom,
                decorationRight: `${parentRect.right - frameRect.right - 20}px`,
                decorationTop: `${bottomOffset}px`
            });
        }
    }

    /**
     * 根據內容高度調整顯示模式
     * 決定是否啟用滾動以及是否固定現正演唱歌曲
     */
    function adjustDisplayMode() {
        // 重置之前的樣式，避免殘留影響
        resetStyles();
        
        // 檢查歌單和當前歌曲的內容
        const hasSungSongs = sungSongsList.children.length > 0;
        const hasCurrentSong = currentSong.style.display !== 'none';
        
        // 情況E: 僅有現正演唱，沒有已唱過的曲目 - 應該將現正演唱上移40px
        if (hasCurrentSong && !hasSungSongs) {
            STATE.displayMode = 'only-current';
            setEmptyMode();
            return;
        }
        
        // 情況F: 無現正演唱，也沒有已唱過的曲目 - 應該隱藏框架
        if (!hasCurrentSong && !hasSungSongs) {
            STATE.displayMode = 'empty';
            setOnlyCurrentSongMode();
            return;
        }
        
        // 計算關鍵高度
        const sungSongsHeight = songList.scrollHeight;
        const currentSongHeight = getCurrentSongHeight();
        const totalContentHeight = sungSongsHeight + currentSongHeight;
        const maxFrameHeight = getMaxFrameHeight();
        
        // 添加安全邊距來判斷是否需要滾動
        // 這樣即使內容略小於最大高度，也會啟用滾動模式以防文字被切割
        const adjustedContentHeight = totalContentHeight + CONFIG.safetyMargin;
        
        // 判斷顯示模式
        if (adjustedContentHeight > maxFrameHeight) {
            // 情況B或D：歌曲太多或接近最大高度時 - 固定模式
            STATE.displayMode = 'fixed';
            setFixedMode(sungSongsHeight, currentSongHeight, maxFrameHeight, hasCurrentSong);
        } else {
            // 情況A或C：歌曲較少時 - 自然佈局，高度隨內容伸縮
            STATE.displayMode = 'natural';
            setNaturalMode(totalContentHeight, hasCurrentSong);
        }
        
        // 在調整顯示模式後更新裝飾元素位置
        updateDecorationPosition();
    }
    
    /**
     * 重置樣式以避免不同模式之間的干擾
     */
    function resetStyles() {
        // 停止任何正在進行的滾動
        stopAutoScroll();
        
        // 重置滾動區域樣式
        scrollableArea.style.height = '';
        scrollableArea.style.maxHeight = '';
        scrollableArea.style.paddingBottom = '';
        
        // 重置歌單樣式
        songList.style.paddingBottom = '';
        
        // 重置現正演唱歌曲樣式
        currentSong.classList.remove('fixed');
        currentSong.style.marginTop = '';
        
        // 重置列表框架樣式
        listFrame.style.height = '';
        listFrame.style.maxHeight = '';
        listFrame.style.display = ''; // 確保框架可見
        
        // 重置類名
        listFrame.classList.remove('natural-mode');
        listFrame.classList.remove('fixed-mode');
        listFrame.classList.remove('only-current-mode');
        listFrame.classList.remove('empty-mode');
    }
    
    /**
     * 設置僅有現正演唱歌曲的模式
     * 情況F：隱藏框架，只顯示標題 (無現正演唱，也沒有已唱過的曲目)
     */
    function setOnlyCurrentSongMode() {
        // 隱藏歌單框架
        listFrame.style.display = 'none';
        listFrame.classList.add('only-current-mode');
        
        // 更新裝飾元素位置
        updateDecorationPosition();
    }
    
    /**
     * 設置空狀態模式
     * 情況E：現正演唱歌曲上移 40px (僅有現正演唱，沒有已唱過的曲目)
     */
    function setEmptyMode() {
        listFrame.classList.add('empty-mode');
        
        // 預留上方空間，讓現正演唱歌曲位置上移
        if (currentSong) {
            currentSong.style.marginTop = `-${CONFIG.onlyCurrentSongTopMargin}px`;
        }
        
        // 更新裝飾元素位置
        updateDecorationPosition();
    }
    
    /**
     * 設置固定模式 - 框高度固定，現正演唱歌曲固定在底部
     * @param {number} sungSongsHeight - 歌單高度
     * @param {number} currentSongHeight - 現正演唱歌曲高度
     * @param {number} maxHeight - 最大可用高度
     * @param {boolean} hasCurrentSong - 是否有現正演唱歌曲
     */
    function setFixedMode(sungSongsHeight, currentSongHeight, maxHeight, hasCurrentSong) {
        // 設置框架高度為最大高度
        listFrame.style.height = `${maxHeight}px`;
        listFrame.classList.add('fixed-mode');
        
        const extraSpace = CONFIG.extraSpaceBuffer;
        
        // 根據是否有現正演唱歌曲來決定佈局
        if (hasCurrentSong) {
            // 情況D: 有現正演唱、歌單長於顯示範圍
            // 添加固定樣式類
            currentSong.classList.add('fixed');
            
            // 計算滾動區域的可用高度 - 優化底部空間
            const availableHeight = maxHeight - currentSongHeight - extraSpace;
            
            // 設置滾動區域高度
            scrollableArea.style.height = `${availableHeight}px`;
            scrollableArea.style.maxHeight = `${availableHeight}px`;
            
            // 為固定的當前歌曲騰出空間 - 減少多餘空間
            songList.style.paddingBottom = `${currentSongHeight + Math.floor(extraSpace/2)}px`;
            
            // 檢查是否需要啟動滾動
            checkScrollingRequirement(sungSongsHeight, availableHeight);
        } else {
            // 情況B: 無現正演唱、歌單長於顯示範圍
            // 滾動區域佔據整個高度
            scrollableArea.style.height = `${maxHeight}px`;
            scrollableArea.style.maxHeight = `${maxHeight}px`;
            
            // 為底部預留更多空間
            songList.style.paddingBottom = `${CONFIG.safetyMargin}px`;
            
            // 提前啟動滾動，確保底部文字完全可見
            startAutoScroll();
        }
        
        // 更新裝飾元素位置
        updateDecorationPosition();
    }
    
    /**
     * 檢查是否需要啟動滾動
     * @param {number} sungSongsHeight - 歌單高度
     * @param {number} availableHeight - 可用顯示區域高度
     */
    function checkScrollingRequirement(sungSongsHeight, availableHeight) {
        // 檢查歌單項目的可見性
        const songItems = sungSongsList.querySelectorAll('li');
        let shouldScroll = false;
        
        // 更寬鬆的條件，提前啟動滾動
        // 如果歌單高度非常接近可用高度，就啟動滾動
        if (sungSongsHeight > availableHeight - CONFIG.safetyMargin) {
            shouldScroll = true;
        }
        
        // 如果有歌曲項目，檢查是否所有項目都完全可見
        if (!shouldScroll && songItems.length > 0) {
            // 檢查最後一個可見的歌曲項目
            for (let i = 0; i < songItems.length; i++) {
                const songItem = songItems[i];
                const itemBottom = songItem.offsetTop + songItem.offsetHeight;
                
                // 提前檢測是否需要滾動 - 使用更大的偏移量
                if (itemBottom + CONFIG.scrollVisibilityOffset > availableHeight) {
                    shouldScroll = true;
                    break;
                }
            }
        }
        
        // 如果需要滾動，啟動自動滾動功能
        if (shouldScroll) {
            startAutoScroll();
        }
    }
    
    /**
     * 設置自然模式 - 框高度隨內容伸縮，現正演唱歌曲跟隨在歌單後面
     * @param {number} totalHeight - 總內容高度
     * @param {boolean} hasCurrentSong - 是否有現正演唱歌曲
     */
    function setNaturalMode(totalHeight, hasCurrentSong) {
        // 設置框架高度自適應內容，但不超過最大高度
        listFrame.style.height = 'auto';
        listFrame.classList.add('natural-mode');
        
        // 設置滾動區域高度自適應
        scrollableArea.style.height = 'auto';
        scrollableArea.style.maxHeight = 'none';
        
        // 確保現正演唱歌曲自然跟隨
        currentSong.classList.remove('fixed');
        songList.style.paddingBottom = '0';
        
        // 當沒有現正演唱歌曲時，為滾動區域添加底部內縮
        if (!hasCurrentSong) {
            scrollableArea.style.paddingBottom = `${CONFIG.naturalModeBottomPadding}px`;
        } else {
            scrollableArea.style.paddingBottom = '0';
        }
        
        // 更新裝飾元素位置
        updateDecorationPosition();
    }

    /**
     * 啟動自動滾動
     * 實現平滑的上下滾動效果
     */
    function startAutoScroll() {
        // 如果已經有滾動間隔，先清除它
        stopAutoScroll();
        
        // 初始化滾動狀態
        STATE.scrollPosition = 0;
        STATE.scrollDirection = 1;
        STATE.isPaused = false;
        scrollableArea.scrollTop = 0;
        
        STATE.scrollInterval = setInterval(() => {
            if (STATE.isPaused) return;
            
            // 計算滾動範圍 - 添加額外空間確保滾動到最後一首歌
            const songListHeight = songList.scrollHeight + CONFIG.extraScrollSpace;
            const visibleAreaHeight = scrollableArea.clientHeight;
            const maxScroll = Math.max(0, songListHeight - visibleAreaHeight);
            
            // 內容不足以滾動時停止
            if (maxScroll <= 0) {
                stopAutoScroll();
                return;
            }
            
            // 更新滾動位置
            STATE.scrollPosition += STATE.scrollDirection * CONFIG.scrollSpeed;
            
            // 檢查邊界並處理方向變換
            handleScrollBoundaries(maxScroll);
            
            // 應用滾動位置
            scrollableArea.scrollTop = STATE.scrollPosition;
            
            // 每次滾動更新後檢查裝飾元素位置
            if (STATE.scrollPosition % 50 === 0) { // 每滾動50像素更新一次
                updateDecorationPosition();
            }
        }, CONFIG.scrollInterval);
    }
    
    /**
     * 處理滾動到邊界時的行為
     * @param {number} maxScroll - 最大滾動位置
     */
    function handleScrollBoundaries(maxScroll) {
        if (STATE.scrollPosition >= maxScroll + CONFIG.bottomScrollBuffer) {
            // 到達底部，暫停後向上滾動
            if (!STATE.isPaused) {
                STATE.isPaused = true;
                // 確保停在真正的底部，但減少額外緩衝讓底部空間更緊湊
                STATE.scrollPosition = maxScroll + CONFIG.bottomScrollBuffer;
                
                setTimeout(() => {
                    STATE.scrollDirection = -1;
                    STATE.isPaused = false;
                }, CONFIG.scrollPauseTime);
            }
        } else if (STATE.scrollPosition <= 0) {
            // 到達頂部，暫停後向下滾動
            if (!STATE.isPaused) {
                STATE.isPaused = true;
                STATE.scrollPosition = 0;
                
                setTimeout(() => {
                    STATE.scrollDirection = 1;
                    STATE.isPaused = false;
                }, CONFIG.scrollPauseTime);
            }
        }
    }

    /**
     * 停止自動滾動
     */
    function stopAutoScroll() {
        if (STATE.scrollInterval) {
            clearInterval(STATE.scrollInterval);
            STATE.scrollInterval = null;
        }
        scrollableArea.scrollTop = 0;
    }

    /**
     * 處理視窗大小變化
     * 使用 debounce 技術避免過於頻繁的重新計算
     */
    function handleResize() {
        // 清除之前的計時器
        if (STATE.resizeTimeout) {
            clearTimeout(STATE.resizeTimeout);
        }
        
        // 設置新的計時器，延遲執行調整顯示模式
        STATE.resizeTimeout = setTimeout(() => {
            adjustDisplayMode();
            // 更新裝飾元素位置
            updateDecorationPosition();
        }, 250);
    }

    // 事件監聽
    function setupEventListeners() {
        // 監聽 storage 事件，當其他頁面修改 localStorage 時接收更新
        window.addEventListener('storage', (event) => {
            if (event.key === 'sungSongs' || event.key === 'currentSong') {
                updateDisplay();
            }
        });

        // 監聽窗口大小變化
        window.addEventListener('resize', handleResize);

        // 監聽自定義的 songlistupdate 事件
        window.addEventListener('songlistupdate', updateDisplay);
        
        // 監聽滾動事件以便在滾動時更新裝飾元素位置
        scrollableArea.addEventListener('scroll', () => {
            // 使用 requestAnimationFrame 優化性能
            requestAnimationFrame(updateDecorationPosition);
        });
    }

    // 初始化
    function init() {
        setupEventListeners();
        updateDisplay();
        
        // 創建一個輪詢機制，頻繁檢查 localStorage 以便實時更新
        setInterval(updateDisplay, CONFIG.updateInterval);
    }

    // 啟動系統
    init();
});