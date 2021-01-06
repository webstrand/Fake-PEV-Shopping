class Ajax {
  constructor() {
    this._API_PATH_NAME = 'api';
    this._BASE_API_URL = `${location.origin}/${this._API_PATH_NAME}`;
    this._AUTH_TOKEN = '';
  }

  get _BASE_API_URL_OBJECT() {
    const urlObject = new URL(location.origin);
    urlObject.pathname = `${this._API_PATH_NAME}/`;

    return urlObject;
  }

  _getContentTypeHeader() {
    return {
      'Content-Type': 'application/json',
    };
  }

  _getAuthHeader() {
    return `Bearer ${this._AUTH_TOKEN}`;
  }

  // TODO: fix creating URL by apiEndpoint
  getRequest(apiEndpoint, useToken) {
    const url = this._BASE_API_URL_OBJECT;

    if (typeof apiEndpoint === 'object') {
      url.pathname += apiEndpoint.url;

      apiEndpoint.searchParams.forEach((value, key) => {
        url.searchParams.append(key, value);
      });
    } else {
      url.pathname += apiEndpoint;
    }

    const options = {};

    if (useToken) {
      options.headers = {
        Authorization: this._getAuthHeader(),
      };
    }

    return fetch(url.toString(), options).then((response) => response.json());
  }

  postRequest(apiEndpoint, data, useToken) {
    const headers = new Headers(this._getContentTypeHeader());

    if (useToken) {
      headers.append('Authorization', this._getAuthHeader());
    }

    return fetch(`${this._BASE_API_URL}/${apiEndpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data || {}),
    })
      .then((response) => {
        console.warn('POST response headers', response.headers);

        return response.json();
      })
      .then((body) => {
        if (body.token) {
          this._AUTH_TOKEN = body.token;
        }

        return body.payload;
      });
  }
}

const apiService = new (class ApiService extends Ajax {
  constructor() {
    super();

    this.PRODUCTS_URL = 'products';
    this.PRODUCT_CATEGORIES_URL = 'productCategories';
    this.USERS_URL = 'users';
  }

  addProduct(product) {
    return this.postRequest(this.PRODUCTS_URL, product);
  }

  getProducts({ pagination, productCategories } = {}) {
    const searchParams = new URLSearchParams();

    if (pagination && Object.keys(pagination).length) {
      searchParams.append('page', pagination.pageNumber);
      searchParams.append('limit', pagination.productsPerPage);
    }

    if (productCategories && productCategories.length) {
      searchParams.append('productCategories', productCategories);
    }

    return this.getRequest({ url: this.PRODUCTS_URL, searchParams });
  }

  getProductsById(idList) {
    return this.getRequest(`${this.PRODUCTS_URL}?idList=${idList}`);
  }

  // getProduct(id) {
  //   return this.getRequest(`${this.PRODUCTS_URL}/${id}`);
  // }

  getProductCategories() {
    return this.getRequest(this.PRODUCT_CATEGORIES_URL);
  }

  getUser() {
    const userId = '5f5a8dce154f830fd840dc7b';
    return this.getRequest(`${this.USERS_URL}/${userId}`, true);
  }

  loginUser(credentials) {
    return this.postRequest(`${this.USERS_URL}/login`, credentials);
  }

  logoutUser() {
    return this.postRequest(`${this.USERS_URL}/logout`, null, true);
  }
})();

export default apiService;
