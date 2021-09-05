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

    const createOptions = async (filters) => { //функция создания selectы со всеми фильмами/статусами/гендерами.
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

        const filter = data => {
            const keys = Object.keys(metaDataValues); //названия фильтров
            let flag = true;
            let filterMetaValue, filterDataValue;
            data = data.reduce((newData, item) => { //проходимся по всем элементам данных и создает массив с отфильтрованным персонажами
                for (let i = 0; i < keys.length; i++) {//каждый элемент проверяем по фильтрам
                    filterDataValue = item[keys[i]];
                    filterMetaValue = metaDataValues[keys[i]];
                    if (filterMetaValue !== "All") { //если значение фильтра ALL - пропускаем его
                        if (!filterDataValue) {//если у персонажа нет нужного поля - он не попадает под фильтр
                            flag = false;
                            break;
                        }
                        if (Array.isArray(filterDataValue)) { //если значение - массив, используем includes
                            if (!filterDataValue.includes(filterMetaValue)) {//проверяем что поле персонажа подходит под выбор в select
                                flag = false;
                                break; //если не подходит, по остальным фильтрам его не проверяем
                            }
                        }
                        else { //если не массив - просто проверяем значение
                            if (filterDataValue !== filterMetaValue) {
                                flag = false;
                                break;
                            }
                        }
                    }
                }
                if (flag) //если флаг === true, то персонаж прошел все фильтры
                    newData.push(item); //тогда добавляем его в новый массив
                flag = true;
                return newData;
            }, []);
            return data; //возвращаем отфильтрованные данные
        };

        let filteredData = filter(data);//фильтруем данные по select-ам

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

    //вешаем событие на ресет, дальше по всплытию сработает submit
    document.querySelector('.reset__btn').addEventListener('click', () => filterForm.reset());

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