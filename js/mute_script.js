

window.onload = () => {
    const audio = document.getElementById('myAudio');
    audio.style.display = 'none';

    const muteButton = document.getElementById('muteButton');
    muteButton.addEventListener('click', () => {
        console.log('Button clicked');
        audio.muted = !audio.muted;

        // Change the icon based on the mute state
        if (audio.muted) {
            muteIcon.src = '../media/unmute-icon.png';  // Change to mute icon
        } else {
            muteIcon.src = '../media/mute-icon.png';  // Change to unmute icon
        }
    });    
};
