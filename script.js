document.addEventListener('DOMContentLoaded', async () => {
    "use strict";
    const moviesSelect = document.getElementById('movies__select'),
        genderSelect = document.getElementById('gender__select'),
        statusSelect = document.getElementById('status__select'),
        filterForm = document.querySelector('.filter__form'),
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

    const createOptions = async () => { //функция создания selectы со всеми фильмами/статусами/гендерами.
        // Создана на случай, если в json добавился бы новый фильм/статус/гендер(другое написание, неизвестный пол и тп)
        let optionsMovie = new Set(),
            optionsGender = new Set(),
            optionsStatus = new Set();
        const data = await getData();
        data.forEach(element => {
            if (element["movies"])
                element["movies"].forEach((item) => {
                    optionsMovie.add(item.trim());
                });
            if (element["status"])
                optionsStatus.add(element["status"].trim());
            if (element["gender"])
                optionsGender.add(element["gender"].trim());
        });
        optionsMovie = [...optionsMovie].sort(); //сортируем фильмы в алфавитном порядке(для красоты и удобства)
        const insertOption = (options, select) => {
            options.forEach((item) => {
                select.insertAdjacentHTML('beforeend', `<option value='${item}'>${item}</option>`);
            });
        }
        insertOption(optionsMovie, moviesSelect)
        insertOption(optionsStatus, statusSelect)
        insertOption(optionsGender, genderSelect)
    };
    createOptions();

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
        const metaDataField = { //список данных, по которым производится фильтр
            name: ['name', name => name ? name : 'unknown'], //если каких-то данных нет, меняем их на "неизвестного"
            photo: ['photo', photo => photo ? photo : 'dbimage/unknown.jpg'],
            status: ['status', status => status ? status : 'unknown'],
            realName: ['realName', realName => realName ? realName : 'unknown'],
            movies: ['movies', movies => movies ? movies : ['None']],
        };
        const metaDataValues = { //создано для удобства добавления новых фильтров
            //по сути если добавится другой select, его нужно будет только добавить сюда
            "movies": moviesSelect.value,
            "gender": genderSelect.value,
            "status": statusSelect.value
        }
        const filter = (data, filterValue) => { //функция для фильтра данных по любому из фильтров
            if (metaDataValues[filterValue] !== "All") { //если выбрано All - не меняем данные
                data = data.reduce((newObj, item) => { //создаем новый объект из геров, которые попадают под текущий фильтр
                    if (!!item[filterValue]) { //проверяем, что персонаж имеет данный фильтр(например, DareDavil не имеет фильмов)
                        if (typeof (item[filterValue]) === "object") { //если массив - используем includes
                            if (item[filterValue].includes(metaDataValues[filterValue]))//проверяем что поле персонажа подходит под выбор в select
                                newObj.push(item);
                        }
                        else //если не массив - просто проверяем значение
                            if (!!item[filterValue] && item[filterValue] === metaDataValues[filterValue])
                                newObj.push(item);
                    }
                    return newObj;
                }, []);
            }
            return data;
        }
        //Фильтруем данные последовательно по каждому из фильтров.
        //Можно было бы фильтровать одновременно по всем, составляя большое условие, но тогда было бы неудобно внедрять новые фильтры, мне кажется
        let filteredData = data;
        Object.keys(metaDataValues).forEach(item => {
            filteredData = filter(filteredData, item);
        }); //передаем в функцию текущий фильтр и текущие данные

        const filterFields = filterMeta(metaDataField); //получаем функцию-фильтр, которая "вычленяет" только нужные поля
        filteredData = filteredData.reduce((newObj, item) => { //создаем новый объект из геров, получая только нужные поля
            newObj.push(filterFields(item));
            return newObj;
        }, []);
        //так последовательно получаем итоговые данные, в которых есть только нужные поля и которые отфильтрованы по всем фильтрам
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
    filterForm.addEventListener('submit', async e => {
        e.preventDefault();
        const data = await getData(); //получаем данные с сервера каждый раз(на случай, если данные изменили за время последнего запроса(если бы они были нестатичны))
        const filteredData = filterData(data); //фильтруем данные
        cardsContainer.textContent = ''; //стираем все, что было до этого
        if (filteredData.length === 0) {
            alert("По данному фильтр-запросу ничего не найдено:(");
        }
        else
            createCards(filteredData); //вставляем новые данные
    });
    //Возможность щелкать по фильмам в карте персанажа и переходить на них
    cardsContainer.addEventListener('click', e => {
        if (e.target.tagName === "LI") {
            moviesSelect.value = e.target.textContent;
            filterForm.dispatchEvent(new Event('submit'));
        }
    });
    filterForm.dispatchEvent(new Event('submit'));//сразу отображаем все фильмы
});