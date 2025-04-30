document.addEventListener('DOMContentLoaded', () => {
    const upcomingSongs = document.getElementById('upcomingSongs');
    const sungSongs = document.getElementById('sungSongs');
    const currentSongInput = document.getElementById('currentSong');
    const updateListBtn = document.getElementById('updateList');
    const nextSongBtn = document.getElementById('nextSong');

    // 從 localStorage 加載數據
    upcomingSongs.value = localStorage.getItem('upcomingSongs') || '';
    sungSongs.value = localStorage.getItem('sungSongs') || '';
    currentSongInput.value = localStorage.getItem('currentSong') || '';

    function updateLocalStorage() {
        localStorage.setItem('upcomingSongs', upcomingSongs.value);
        localStorage.setItem('sungSongs', sungSongs.value);
        localStorage.setItem('currentSong', currentSongInput.value);
        // 觸發自定義事件
        window.dispatchEvent(new Event('songlistupdate'));
    }

    function nextSong() {
        if (currentSongInput.value.trim() !== '') {
            // 如果當前有歌曲，將其添加到已唱歌單的尾部，然後清空當前歌曲
            sungSongs.value = (sungSongs.value.trim() + '\n' + currentSongInput.value.trim()).trim();
            currentSongInput.value = '';
        } else {
            // 如果當前沒有歌曲，則從準備歌單中取出下一首
            const upcomingSongsArray = upcomingSongs.value.split('\n');
            if (upcomingSongsArray.length > 0 && upcomingSongsArray[0].trim() !== '') {
                currentSongInput.value = upcomingSongsArray.shift().trim();
                upcomingSongs.value = upcomingSongsArray.join('\n');
            }
        }

        updateLocalStorage();
    }

    updateListBtn.addEventListener('click', updateLocalStorage);
    nextSongBtn.addEventListener('click', nextSong);

    // 當文本區域或輸入框內容改變時,自動更新 localStorage
    upcomingSongs.addEventListener('input', updateLocalStorage);
    sungSongs.addEventListener('input', updateLocalStorage);
    currentSongInput.addEventListener('input', updateLocalStorage);

    function resetStorage(){
        localStorage.clear();
        window.location.reload();
    }
});