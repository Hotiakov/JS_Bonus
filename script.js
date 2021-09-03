document.addEventListener('DOMContentLoaded', async () => {
    "use strict";
    const moviesSelect = document.getElementById('movies__select'),
        genderSelect = document.getElementById('gender__select'),
        statusSelect = document.getElementById('status__select'),
        filterForm = document.getElementById('filter__form'),
        cardsContainer = document.querySelector('.cards__container');

    const getData = async () => {
        document.body.classList.remove('loaded'); //добавляем прелоад(если бы запрос долго обрабатывался)
        const response = await fetch('./dbHeroes.json');
        document.body.classList.add('loaded'); //убираем прелоад после загрузки
        if (!response.ok) {
            throw new Error('Ошибка при получении данных с сервера');
        } else {
            return await response.json();
        }
    };

    const createMoviesOptions = async () => { //функция создания select со всеми фильмами. Создана на случай, если в json добавился бы новый фильм
        let options = new Set();
        const data = await getData();
        data.forEach(element => {
            if (element["movies"])
                element["movies"].forEach((item) => {
                    options.add(item.trim());
                });
        });
        options = [...options].sort(); //сортируем фильмы в алфавитном порядке(для красоты и удобства)
        options.forEach((item) => {
            moviesSelect.insertAdjacentHTML('beforeend', `<option value='${item}'>${item}</option>`);
        });
    };
    createMoviesOptions();

    const filterMeta = (meta) => {//функция получения фильтра по мета-данным
        const keys = Object.keys(meta);
        return (obj) => {
            const newObj = {};
            keys.forEach(key => {
                const def = meta[key];
                const val = def[1](obj[def[0]]);
                newObj[key] = val;
            });
            return newObj;
        }
    };
    const filterData = (data) => { //функция фильтра данных, полученных с сервара
        const metaData = { //список данных, по которым производится фильтр
            name: ['name', name => name ? name : 'unknown'], //если каких-то данных нет, меняем их на "неизвестного"
            photo: ['photo', photo => photo ? photo : 'dbimage/unknown.jpg'],
            status: ['status', status => status ? status : 'unknown'],
            realName: ['realName', realName => realName ? realName : 'unknown'],
            movies: ['movies', movies => movies ? movies : ['None']],
        };
        const filter = filterMeta(metaData); //получаем функцию-фильр
        let filteredData;
        if (moviesSelect.value === "All") { //если выбрано All - показыавем всех
            filteredData = data.map(filter);
        }
        else {
            filteredData = data.reduce((newObj, item) => { //создаем новый объект из геров, получая только нужные поля
                if (moviesSelect.value === "All") {
                    newObj.push(filter(item));
                }
                if (!!item["movies"] && item["movies"].includes(moviesSelect.value)) //проверяем, что персонаж имеет фильм(например, DareDavil его не имеет)
                    //и что фильм подходит под выбор в select
                    newObj.push(filter(item));
                return newObj;
            }, []);
        }
        return filteredData;
    };

    const createCards = (data) => { //функция создания карточки героя
        data.forEach(item => {
            cardsContainer.insertAdjacentHTML('beforeend', `
                <div class="cards__item" style="background: url('./${item['photo']}') top/cover no-repeat">
                    <div class="cards__item-wrapper">
                        <p class="cards__item_name"><span>Name:</span> ${item['name']}</p>
                        <p class="cards__item_realname"><span>RealName:</span> ${item['realName']}</p>
                        <p class="cards__item_status"><span>Status:</span> ${item['status']}</p>
                        <p><span>Movies:</span></p>
                        <ul class="cards__item_movies">
                        </ul>
                    </div>
                </div>`);
            const movie = cardsContainer.lastChild.querySelector('.cards__item_movies');
            item['movies'].forEach(element => {
                movie.insertAdjacentHTML('beforeend', `
                        <li class="cards__item_movie">${element}</li>
                `);
            });
        });
    };


    //Вешаем событие изменения выпадающего списка
    moviesSelect.addEventListener('change', async (e) => {
        const data = await getData(); //получаем данные с сервера каждый раз(на случай, если данные изменили за время последнего запроса(если бы они были нестатичны))
        const filteredData = filterData(data); //фильтруем данные
        cardsContainer.textContent = ''; //стираем все, что было до этого
        createCards(filteredData); //вставляем новые данные
    });
    //Возможность щелкать по фильмам в карте персанажа и переходить на них
    cardsContainer.addEventListener('click', e => {
        if (e.target.tagName === "LI") {
            moviesSelect.value = e.target.textContent;
            moviesSelect.dispatchEvent(new Event('change'));
        }
    })
});