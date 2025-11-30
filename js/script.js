// ============================================================
// 1. DOM 요소 (초기화)
// ============================================================
const DOM = {
  // 쿼리는 App.setupDOM()에서 실행합니다.
  cityInput: null, searchBtn: null, locationBtn: null, recentContainer: null,
  errorDisplay: null, currentSection: null, forecastSection: null, 
  forecastContainer: null, date: null, cityName: null, icon: null, 
  temp: null, desc: null, humidity: null, wind: null, windUnit: null, 
  unitBtn: null, outfitText: null, searchBox: null
};

// 2. STATE
const State = {
  unit: 'metric',
  lastCity: '',
  recentCities: []
};

// 3. API
const API = {
  async fetchWeatherByCity(city) {
    const res = await fetch(`/api/weather?city=${city}&units=${State.unit}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '도시를 찾을 수 없습니다.');
    return data;
  },

  async fetchWeatherByCoords(lat, lon) {
    const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}&units=${State.unit}`);
    const data = await res.json();
    if (!res.ok) throw new Error('날씨 정보를 가져올 수 없습니다.');
    return data;
  }
};

// 4. UTILS
const Utils = {
  getIcon(code) {
    const baseUrl = 'https://basmilius.github.io/weather-icons/production/fill/all/';
    const isDay = code.includes('d');
    const mapping = {
      '01': isDay ? 'clear-day' : 'clear-night',
      '02': isDay ? 'partly-cloudy-day' : 'partly-cloudy-night',
      '03': 'cloudy',
      '04': 'overcast',
      '09': 'rain',
      '10': isDay ? 'partly-cloudy-day-rain' : 'partly-cloudy-night-rain',
      '11': 'thunderstorms',
      '13': 'snow',
      '50': 'mist'
    };
    const name = mapping[code.slice(0, 2)] || (isDay ? 'clear-day' : 'clear-night');
    return `${baseUrl}${name}.svg`;
  },

  translateDesc(text) {
    const dict = {
      '실 비': '이슬비',
      '튼구름': '구름 조금',
      '온흐림': '흐림',
      '박무': '옅은 안개'
    };
    return dict[text] || text;
  },

  getOutfit(temp) {
    let t = temp;
    if (State.unit === 'imperial') t = (temp - 32) * 5 / 9;

    if (t >= 28) return '🥵 찜통더위! 민소매, 반바지, 린넨 소재가 살길.';
    if (t >= 23) return '☀️ 반팔, 얇은 셔츠, 반바지나 면바지가 딱 좋아요.';
    if (t >= 20) return '👚 얇은 가디건이나 긴팔티, 청바지 추천!';
    if (t >= 17) return '🧥 얇은 니트, 맨투맨, 후드티에 겉옷을 챙기세요.';
    if (t >= 12) return '🌬️ 자켓, 야상, 간절기 코트! 스타킹도 신을 때예요.';
    if (t >= 9) return '🧣 꽤 쌀쌀해요. 트렌치코트나 도톰한 점퍼가 필요해요.';
    if (t >= 5) return '🥶 코트, 가죽자켓, 히트텍! 따뜻하게 입고 나가세요.';
    return '☃️ 이불 속으로...';
  },

  formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const w = date.toLocaleDateString('ko-KR', { weekday: 'short' });
    return `${m}/${d}(${w})`;
  },

  groupForecast(list) {
    const daily = {};

    list.forEach(item => {
      const key = item.dt_txt.split(' ')[0];
      if (!daily[key]) {
        daily[key] = {
          min: item.main.temp,
          max: item.main.temp,
          icon: item.weather[0].icon,
          dt: item.dt
        };
      } else {
        daily[key].min = Math.min(daily[key].min, item.main.temp);
        daily[key].max = Math.max(daily[key].max, item.main.temp);

        if (item.dt_txt.includes('06:00:00') || item.dt_txt.includes('09:00:00')) {
          daily[key].icon = item.weather[0].icon;
        }
      }
    });

    return Object.keys(daily)
      .sort()
      .slice(0, 5)
      .map(key => daily[key]);
  }
};

// 5. UI
const UI = {
  showError(msg) {
    if (msg) {
      DOM.errorDisplay.textContent = msg;
      DOM.errorDisplay.classList.remove('hidden');
      DOM.currentSection.classList.add('hidden');
      DOM.forecastSection.classList.add('hidden');
    } else {
      DOM.errorDisplay.classList.add('hidden');
    }
  },

  renderCurrent(data) {
    const { name, main, weather, wind } = data;

    const now = new Date();
    DOM.date.textContent = `${now.getMonth() + 1}월 ${now.getDate()}일 (${now.toLocaleDateString('ko-KR', { weekday: 'short' })})`;

    const displayName = State.lastCity.charAt(0).toUpperCase() + State.lastCity.slice(1).toLowerCase();
    DOM.cityName.textContent = displayName;
    // DOM.cityName.textContent = name;
    DOM.temp.textContent = `${main.temp.toFixed(1)}°`;
    DOM.icon.src = Utils.getIcon(weather[0].icon);

    const desc = Utils.translateDesc(weather[0].description);
    DOM.desc.textContent = desc;
    DOM.icon.alt = desc;

    DOM.humidity.textContent = main.humidity;
    DOM.wind.textContent = wind.speed;

    // windUnit이 누락되어 있었는데, DOM.wind.nextSibling으로 대체합니다.
    DOM.unitBtn.textContent = State.unit === 'metric' ? '°C' : '°F';
    DOM.wind.nextSibling.textContent = State.unit === 'metric' ? ' m/s' : ' mph';


    DOM.outfitText.textContent = Utils.getOutfit(main.temp);

    DOM.currentSection.classList.remove('hidden');
    this.showError(null);
  },

  renderForecast(data) {
    const grouped = Utils.groupForecast(data.list);
    DOM.forecastContainer.innerHTML = '';

    grouped.forEach(day => {
      const card = document.createElement('div');
      card.className = 'forecast-card';
      card.innerHTML = `
        <p style="font-weight: bold; margin-bottom: 5px;">${Utils.formatDate(day.dt)}</p>
        <img src="${Utils.getIcon(day.icon)}" alt="icon" style="width: 50px; height: 50px;">
        <div class="temp-range" style="font-size: 0.95rem;">
          <span style="color: #3b82f6; font-weight: bold;">${day.min.toFixed(1)}°</span>
          <span style="color: #ccc; margin: 0 4px;">/</span>
          <span style="color: #ef4444; font-weight: bold;">${day.max.toFixed(1)}°</span>
        </div>
      `;
      DOM.forecastContainer.appendChild(card);
    });

    DOM.forecastSection.classList.remove('hidden');
  },

  renderRecentSearches() {
    DOM.recentContainer.innerHTML = '';

    if (State.recentCities.length > 0) {
      const title = document.createElement('div');
      title.textContent = '최근 검색어';
      title.style.cssText = 'font-size: 0.8rem; color: #888; margin: 5px 10px;';
      DOM.recentContainer.appendChild(title);
  

    State.recentCities.forEach(city => {
      const btn = document.createElement('button');
      btn.textContent = city;
      btn.addEventListener('click', () => {
        App.searchCity(city);
        DOM.cityInput.value = '';
        DOM.recentContainer.classList.add('hidden');
      });
      DOM.recentContainer.appendChild(btn);
    });
  } else {
    DOM.recentContainer.classList.add('hidden');
    }
  }
};  

// 6. APP
const App = {
  init() {
    this.setupDOM(); // DOM 요소를 찾습니다.
    this.bindEvents();
    this.loadStorage();
  },

  setupDOM() {
    // Cannot set properties of null 오류 해결: DOM 로드 후 요소 찾기
    DOM.cityInput = document.querySelector('#cityInput');
    DOM.searchBtn = document.querySelector('#searchBtn');
    DOM.locationBtn = document.querySelector('#currentLocationBtn');
    DOM.recentContainer = document.querySelector('#recentSearches');
    DOM.errorDisplay = document.querySelector('#errorDisplay');

    DOM.currentSection = document.querySelector('#currentWeather');
    DOM.forecastSection = document.querySelector('#forecast');
    DOM.forecastContainer = document.querySelector('#forecastContainer');

    DOM.date = document.querySelector('#currentDate');
    DOM.cityName = document.querySelector('#cityName');
    DOM.icon = document.querySelector('#weatherIcon');
    DOM.temp = document.querySelector('#currentTemp');
    DOM.desc = document.querySelector('#weatherDesc');
    DOM.humidity = document.querySelector('#humidity');
    DOM.wind = document.querySelector('#windSpeed');
    DOM.unitBtn = document.querySelector('#unitToggleBtn');

    DOM.outfitText = document.querySelector('#outfitText');
    DOM.searchBox = document.querySelector('.search-box');
  },

  bindEvents() {
    DOM.searchBtn.addEventListener('click', () => this.handleSearchInput());
    DOM.cityInput.addEventListener('keyup', e => e.key === 'Enter' && this.handleSearchInput());

    DOM.locationBtn.addEventListener('click', () => {
      if (!navigator.geolocation) return UI.showError('위치 정보를 지원하지 않습니다.');

      navigator.geolocation.getCurrentPosition(
        pos => this.searchCoords(pos.coords.latitude, pos.coords.longitude),
        () => UI.showError('위치 권한이 필요합니다.')
      );
    });

    DOM.unitBtn.addEventListener('click', () => {
      State.unit = State.unit === 'metric' ? 'imperial' : 'metric';
      if (State.lastCity) this.searchCity(State.lastCity);
    });

    DOM.cityInput.addEventListener('click', () => {
      if (State.recentCities.length > 0) DOM.recentContainer.classList.remove('hidden');
    });

    // 안정성 증가: searchBox 영역만 감지
    document.addEventListener('click', e => {
      // DOM.searchBox가 null일 경우 대비
      if (DOM.searchBox && !DOM.searchBox.contains(e.target)) DOM.recentContainer.classList.add('hidden');
    });
  },

  loadStorage() {
    const stored = localStorage.getItem('recentCities');
    if (stored) {
      State.recentCities = JSON.parse(stored);
      UI.renderRecentSearches();
    }
  },

  async handleSearchInput() {
    const city = DOM.cityInput.value.trim();
    if (!city) return UI.showError('도시 이름을 입력하세요.');

    this.searchCity(city);
    DOM.cityInput.value = '';
    DOM.recentContainer.classList.add('hidden');
  },

  async searchCity(city) {
    try {
      UI.showError(null);

      const data = await API.fetchWeatherByCity(city);

      State.lastCity = city;
      this.saveRecent(city);

      UI.renderCurrent(data.current);
      UI.renderForecast(data.forecast);
    } catch (err) {
      UI.showError(err.message);
    }
  },

  async searchCoords(lat, lon) {
    try {
      UI.showError(null);

      const data = await API.fetchWeatherByCoords(lat, lon);

      State.lastCity = data.current.name;
      this.saveRecent(data.current.name);

      UI.renderCurrent(data.current);
      UI.renderForecast(data.forecast);
    } catch (err) {
      UI.showError('날씨 정보를 가져오는데 실패했습니다.');
    }
  },

  saveRecent(city) {
    State.recentCities = State.recentCities.filter(c => c.toLowerCase() !== city.toLowerCase());
    State.recentCities.unshift(city);

    if (State.recentCities.length > 5) State.recentCities.pop();

    localStorage.setItem('recentCities', JSON.stringify(State.recentCities));
    UI.renderRecentSearches();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
// App.init()은 DOMContentLoaded 후 실행됩니다.gi