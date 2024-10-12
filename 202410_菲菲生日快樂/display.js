document.addEventListener('DOMContentLoaded', () => {
    const sungSongsList = document.getElementById('sungSongsList');
    const scrollableArea = document.querySelector('.scrollable-area');
    const currentSong = document.getElementById('currentSong');
    const songList = document.querySelector('.song-list');

    function updateDisplay() {
        sungSongsList.innerHTML = '';
        const sungSongs = localStorage.getItem('sungSongs') || '';
        const currentSongText = localStorage.getItem('currentSong') || '';
        const allSongs = sungSongs.split('\n').filter(song => song.trim() !== '');
        
        let counter = 1;
        allSongs.forEach((song, index) => {
            const li = document.createElement('li');
            const numberSpan = document.createElement('span');
            const textSpan = document.createElement('span');

            numberSpan.classList.add('song-number');
            textSpan.classList.add('song-text');

            if (song.startsWith('//')) {
                li.classList.add('special-format');
                numberSpan.textContent = '-';
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

        if (currentSongText.trim() !== '') {
            currentSong.innerHTML = `
                <span class="song-number"></span>
                <span class="song-text">${insertZeroWidthSpace(currentSongText.trim())}</span>
                <span class="now-singing"></span>
            `;
            currentSong.style.display = 'flex';
        } else {
            currentSong.style.display = 'none';
        }

        checkCurrentSongPosition();
        checkScrollNecessity();
    }

    function insertZeroWidthSpace(text) {
        return text.split('').join('&#8203;');
    }

    function checkCurrentSongPosition() {
        const scrollableAreaRect = scrollableArea.getBoundingClientRect();
        const currentSongRect = currentSong.getBoundingClientRect();

        if (currentSongRect.bottom > scrollableAreaRect.bottom) {
            currentSong.classList.add('fixed');
        } else {
            currentSong.classList.remove('fixed');
        }
    }

    let scrollDirection = 1;
    let scrollPosition = 0;
    let scrollInterval = null;

    function autoScroll() {
        const maxScroll = songList.scrollHeight - scrollableArea.clientHeight;
        
        if (maxScroll <= 0) return; // 如果內容不足以滾動，直接返回

        scrollPosition += scrollDirection * 0.5; // 調整這個值以改變滾動速度
        
        if (scrollPosition >= maxScroll || scrollPosition <= 0) {
            scrollDirection *= -1;
        }

        scrollableArea.scrollTop = scrollPosition;
    }

    function checkScrollNecessity() {
        if (songList.scrollHeight > scrollableArea.clientHeight) {
            if (!scrollInterval) {
                scrollInterval = setInterval(autoScroll, 50);
            }
        } else {
            clearInterval(scrollInterval);
            scrollInterval = null;
        }
    }

    // 初始顯示更新
    updateDisplay();

    // 監聽 storage 事件，當 localStorage 改變時更新顯示
    window.addEventListener('storage', updateDisplay);

    // 監聽自定義的 songlistupdate 事件
    window.addEventListener('songlistupdate', updateDisplay);

    // 保留輪詢機制以確保更新
    setInterval(updateDisplay, 1000);

    // 監聽滾動事件，檢查是否需要固定當前歌曲
    scrollableArea.addEventListener('scroll', checkCurrentSongPosition);

    // 監聽窗口大小變化，重新檢查當前歌曲位置和滾動需求
    window.addEventListener('resize', () => {
        checkCurrentSongPosition();
        checkScrollNecessity();
    });

    window.addEventListener('songlistupdate', updateDisplay);
});