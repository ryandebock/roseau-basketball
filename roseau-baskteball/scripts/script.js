const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('nav ul');

if (navToggle && navMenu) {
    navToggle.addEventListener('click' , () => {
        navMenu.classList.toggle('active');
    });
}

const toggle = document.getElementById('toggle');
                const varsityTable = document.getElementById('varsity-table');
                const jhTable = document.getElementById('jh-table');

                toggle.addEventListener('change', () => {
                    if (toggle.checked) {
                        varsityTable.style.display = 'none';
                        jhTable.style.display = 'block';
                    } else {
                        varsityTable.style.display = 'block';
                        jhTable.style.display = 'none';
                    }
                })

