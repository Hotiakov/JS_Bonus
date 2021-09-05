document.addEventListener('DOMContentLoaded', async () => {
    "use strict";
    const filterForm = document.querySelector('.filter__form'),
        cardsContainer = document.querySelector('.cards__container'),
        popupFilter = document.querySelector('.popup1'),
        popupData = document.querySelector('.popup2');
    const filterArray = [];
    const metaDataValues = {} //создано для удобства добавления новых фильтров
    const metaDataField = { //список данных, которые буду отображаться в карте персонажа
        photo: ['photo', photo => photo ? photo : 'dbimage/unknown.jpg'],
    };

    popupFilter.addEventListener('submit', e => { //форма выбора фильтров
        e.preventDefault();
        popupFilter.style.display = 'none';
        popupData.style.display = 'block';
        const inputs = popupFilter.querySelectorAll('input');
        console.log(inputs);
        inputs.forEach(item => {
            if (item.checked) {
                filterArray.push(item.value);
            }
        });
    });
    popupData.addEventListener('submit', e => { //форма выбора данных для отображения
        e.preventDefault();
        popupData.style.display = 'none';
        const inputs = popupData.querySelectorAll('input');
        inputs.forEach(item => {
            if (item.checked) {
                if (item.value === 'movies') {
                    metaDataField[item.value] = ['movies', a => a ? a : ['None']];
                }
                else {
                    metaDataField[item.value] = [item.value, a => a ? a : "unknown"];
                }
            }
        });
        console.log(metaDataField);
        init();
    });

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

    const createOptions = async options => { //функция создания selectы со всеми переданными фильтрами.
        const optionsObj = {};
        options.forEach(item => optionsObj[item] = new Set()); //создаем обект, у которого ключи - названия фильтров, а значение - Set со всеми опциями фильтров. 
        const data = await getData();
        data.forEach(element => {
            for (let key in optionsObj) {
                if (!element[key]) continue;
                if (key === 'movies') {
                    element[key].forEach((item) => {
                        optionsObj[key].add(item.trim());
                    });
                }
                else {
                    optionsObj[key].add(element[key].trim());
                }
            }
        });
        if ('movies' in optionsObj) optionsObj['movies'] = [...optionsObj['movies']].sort(); //сортируем фильмы в алфавитном порядке(для красоты и удобства)
        const createSelects = () => { //создаем селекты для всех фильтров
            let select;
            const insertOption = (options, select) => {
                options.forEach((item) => {
                    select.insertAdjacentHTML('beforeend', `<option value='${item}'>${item}</option>`);
                });
            }
            options.forEach((item) => {
                select = document.createElement('select');
                select.className = "filter__select";
                select.insertAdjacentHTML('beforeend', `<option value="All">${item[0].toUpperCase() + item.slice(1).toLowerCase()}(All)</option>`);
                filterForm.prepend(select);
                metaDataValues[item] = select;//привязываем к полю фильтра его select
                insertOption(optionsObj[item], select); //встявляем найденные опции в созданные select
            })
        };
        createSelects();
    };

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
    const filterData = (data, filters) => { //функция фильтра данных, полученных с сервара
        const filter = data => {
            const keys = Object.keys(metaDataValues); //названия фильтров
            let flag = true;
            let filterMetaValue, filterDataValue;
            data = data.reduce((newData, item) => { //проходимся по всем элементам данных и создает массив с отфильтрованным персонажами
                for (let i = 0; i < keys.length; i++) {//каждый элемент проверяем по фильтрам
                    filterDataValue = item[keys[i]];
                    filterMetaValue = metaDataValues[keys[i]].value; //получаем значение фильтра из select
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

            const itemNode = document.createElement('div');
            itemNode.className = 'cards__item';
            itemNode.style.background = `url('./${item['photo']}') top/cover no-repeat`;
            itemNode.insertAdjacentHTML('beforeend', `<div class="cards__item-wrapper"></div>`);
            const wrapper = itemNode.querySelector('.cards__item-wrapper');
            for (let key in metaDataField) {
                if (key === 'photo') continue;
                if (key !== 'movies')
                    wrapper.insertAdjacentHTML('beforeend', `
                            <p><span>${key[0].toUpperCase() + key.slice(1).toLowerCase()}:</span> ${item[key]}</p>
                    `);
                else {
                    wrapper.insertAdjacentHTML('beforeend', `
                        <p><span>Movies:</span></p>
                        <ul class="cards__item_movies">
                        </ul>
                    `);
                    const movie = itemNode.querySelector('.cards__item_movies');
                    item['movies'].forEach(element => {
                        movie.insertAdjacentHTML('beforeend', `
                            <li class="cards__item_movie">${element}</li>
                        `);
                    });
                }
            }
            cardsContainer.appendChild(itemNode);
        });
    };

    const addListeners = () => {
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
        //Возможность щелкать по фильмам в карте персанажа и переходить на них(если фильтр с фильмами был добавлен)
        if (!!metaDataValues['movies']) {
            cardsContainer.addEventListener('click', e => {
                if (e.target.tagName === "LI") {
                    metaDataValues['movies'].value = e.target.textContent;
                    filterForm.dispatchEvent(new Event('submit'));
                }
            });
        }
    };

    const init = async () => {
        await createOptions(filterArray.reverse()); //в этот массив добавляются имена полей, по которым

        addListeners();

        filterForm.dispatchEvent(new Event('submit'));//сразу отображаем все фильмы
    }
});