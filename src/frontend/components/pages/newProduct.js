import React, { useEffect, useState, useRef, createRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Formik, Field, ErrorMessage } from 'formik';
import httpService from '../../features/httpService';
import productSpecsService from '../../features/productSpecsService';
import { CategoriesTreeFormField } from '../views/categoriesTree';
import FormFieldError from '../utils/formFieldError';
import { SearchSingleProductByName } from '../views/search';
import FlexibleList from '../utils/flexibleList';

const translations = {
  intro: 'Fill new product details',
  baseInformation: 'Basic information',
  technicalSpecs: 'Technical specification',
  categoryChooser: 'Category',
  chooseCategoryFirst: 'please, choose category first',
  name: 'Name',
  price: 'Price',
  addNewSpec: 'Add new spec',
  confirm: 'Confirm',
  save: 'Save',
  relatedProductsNames: 'Related products names',
  relatedProductName: 'Product name',
  shortDescription: 'Short description',
  duplicatedDescription: 'Description item must be unique!',
  lackOfData: 'No data!',
  emptyCategoryError: 'Category must be selected!',
  colourIsNotTextError: 'Colour value must be a text!',
  modificationError: 'Cannot modify, because no changes were made!',
};

const FIELD_TYPE_MAP = Object.freeze({
  NUMBER: 'number',
  /* TODO: make colour field as input[type="color"] to let convenient color picking
   * a kind of HEX to approx. human readable color name converter should also be provided
   */
  CHOICE: 'text',
});
const SPEC_NAMES_SEPARATORS = Object.freeze({
  GAP: '_',
  LEVEL: '__',
  SPACE: ' ',
});
const FIELD_NAME_PREFIXES = Object.freeze({
  TECHNICAL_SPECS: `technicalSpecs${SPEC_NAMES_SEPARATORS.LEVEL}`,
});
const swapSpaceForGap = (text) => text.replace(/\s/g, SPEC_NAMES_SEPARATORS.GAP);

function BaseInfo({ data: { initialData = {} }, methods: { handleChange, handleBlur } }) {
  return (
    <fieldset>
      <legend>{translations.baseInformation}</legend>

      <label htmlFor="newProductName">{translations.name}</label>
      <input
        id="newProductName"
        name="name"
        type="text"
        onChange={handleChange}
        onBlur={handleBlur}
        defaultValue={initialData.name}
        required
      />

      <label htmlFor="newProductPrice">{translations.price}</label>
      <input
        id="newProductPrice"
        name="price"
        type="number"
        step="0.01"
        min="0.01"
        onChange={handleChange}
        onBlur={handleBlur}
        defaultValue={initialData.price}
        required
      />
    </fieldset>
  );
}

function ShortDescription({ data: { initialData = {} }, field: formikField, form: { setFieldValue } }) {
  const [shortDescriptionList, setShortDescriptionList] = useState([]);

  useEffect(() => {
    setFieldValue(formikField.name, shortDescriptionList.filter(Boolean));
  }, [shortDescriptionList]);

  return (
    <fieldset>
      <legend>{translations.shortDescription}</legend>

      <FlexibleList
        initialListItems={initialData[formikField.name]}
        newItemComponent={(listFeatures) => (
          <ShortDescription.InputComponent shortDescriptionList={shortDescriptionList} listFeatures={listFeatures} />
        )}
        editItemComponent={(shortDescItem, index, listFeatures) => (
          <ShortDescription.InputComponent
            shortDescriptionList={shortDescriptionList}
            editedDescIndex={index}
            presetValue={shortDescItem}
            listFeatures={listFeatures}
          />
        )}
        emitUpdatedItemsList={setShortDescriptionList}
      />

      <input {...formikField} type="hidden" />
    </fieldset>
  );
}
ShortDescription.InputComponent = function InputComponent(props) {
  const inputRef = createRef();
  const [isDisabled, setIsDisabled] = useState(false);
  const updateItem = (updateValue, isEditMode) => {
    if (isEditMode) {
      props.listFeatures.editItem(updateValue, props.editedDescIndex);
    } else {
      props.listFeatures.addItem(updateValue);
    }
  };
  const isEditMode = props.editedDescIndex > -1;
  const validateInput = (value) => {
    const isValid = !props.shortDescriptionList.some((descriptionItem) => value === descriptionItem);
    setIsDisabled(!isValid);

    return isValid;
  };

  return (
    <>
      <input
        ref={inputRef}
        type="text"
        defaultValue={props.presetValue || ''}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();

            const inputValue = event.target.value;

            if (validateInput(inputValue)) {
              updateItem(inputValue, isEditMode);
            }
          }
        }}
        onChange={({ target: { value } }) => {
          if (isDisabled) {
            validateInput(value);
          }
        }}
        autoFocus
        required
      />

      <button
        type="button"
        onClick={() => {
          const inputValue = inputRef.current.value;

          if (validateInput(inputValue)) {
            updateItem(inputValue, isEditMode);
          }
        }}
        disabled={isDisabled}
      >
        {translations.confirm}
      </button>

      {isDisabled && <FormFieldError>{translations.duplicatedDescription}</FormFieldError>}
    </>
  );
};

function CategorySelector({
  data: { initialData = {} },
  methods: { setProductCurrentSpecs, getSpecsForSelectedCategory },
}) {
  const handleCategorySelect = (selectedCategoryName) => {
    setProductCurrentSpecs(getSpecsForSelectedCategory(selectedCategoryName));
  };

  return (
    <fieldset>
      <legend>{translations.categoryChooser}</legend>

      <Field
        name="category"
        required
        component={CategoriesTreeFormField}
        onCategorySelect={handleCategorySelect}
        preSelectedCategory={initialData.category}
      />
      <ErrorMessage name="category" component={FormFieldError} />
    </fieldset>
  );
}

function TechnicalSpecs({ data: { productCurrentSpecs, initialData = [] }, methods: { handleChange, setFieldValue } }) {
  const prepareInitialDataStructure = useMemo(() => {
    const structure = initialData.reduce((output, spec) => {
      const isSpecArray = Array.isArray(spec.data);
      const BASE_HEADING = `${FIELD_NAME_PREFIXES.TECHNICAL_SPECS}${spec.heading}`;

      if (typeof spec.data === 'object' && !isSpecArray) {
        return {
          ...output,
          ...Object.entries(spec.data).reduce(
            (nestedOutput, [key, value]) => ({
              ...nestedOutput,
              [swapSpaceForGap(`${BASE_HEADING}${SPEC_NAMES_SEPARATORS.LEVEL}${key}`)]: value,
            }),
            {}
          ),
        };
      }

      return {
        ...output,
        [swapSpaceForGap(BASE_HEADING)]: isSpecArray ? spec.data.join(', ') : spec.data,
      };
    }, {});

    return { structure, isFilled: !!Object.keys(structure).length };
  }, [initialData]);

  useEffect(() => {
    if (prepareInitialDataStructure.isFilled) {
      Object.entries(prepareInitialDataStructure.structure).forEach(([name, value]) => {
        setFieldValue(name, value);
      });
    }
  }, [prepareInitialDataStructure.structure]);

  const getSpecsFields = () => {
    return productCurrentSpecs.map((spec) => {
      const fieldIdentifier = `${spec.name
        .replace(/(?<=\s)\w/g, (match) => match.toUpperCase())
        .replace(/\s/g, '')}Field`;
      const minValue = spec.fieldType === 'number' ? 0 : null;
      const BASE_NAME = `${FIELD_NAME_PREFIXES.TECHNICAL_SPECS}${spec.fieldName}`;

      return (
        <div key={fieldIdentifier}>
          <label htmlFor={fieldIdentifier}>
            {spec.name.replace(/\w/, (firstChar) => firstChar.toUpperCase())}
            {SPEC_NAMES_SEPARATORS.SPACE}
            {spec.defaultUnit && `(${spec.defaultUnit})`}
          </label>

          {Array.isArray(spec.descriptions) ? (
            spec.descriptions.map((specDescription, index) => {
              const groupFieldIdentifier = `${fieldIdentifier}${index}`;
              const mergedName = `${BASE_NAME}${SPEC_NAMES_SEPARATORS.LEVEL}${specDescription}`;

              return (
                <div key={groupFieldIdentifier}>
                  <label htmlFor={groupFieldIdentifier}>
                    {specDescription.replace(/\w/, (firstChar) => firstChar.toUpperCase())}
                  </label>

                  <input
                    name={mergedName}
                    type={spec.fieldType}
                    min={minValue}
                    id={groupFieldIdentifier}
                    onChange={handleChange}
                    defaultValue={
                      prepareInitialDataStructure.isFilled ? prepareInitialDataStructure.structure[mergedName] : ''
                    }
                    required
                  />
                </div>
              );
            })
          ) : (
            <input
              name={BASE_NAME}
              type={spec.fieldType}
              min={minValue}
              id={fieldIdentifier}
              onChange={handleChange}
              defaultValue={
                prepareInitialDataStructure.isFilled ? prepareInitialDataStructure.structure[BASE_NAME] : ''
              }
              required
            />
          )}

          <ErrorMessage name={`${FIELD_NAME_PREFIXES.TECHNICAL_SPECS}${spec.fieldName}`} component={FormFieldError} />
        </div>
      );
    });
  };

  return (
    <fieldset>
      <legend>
        {translations.technicalSpecs}
        {SPEC_NAMES_SEPARATORS.SPACE}
        {productCurrentSpecs.length === 0 && <span>({translations.chooseCategoryFirst})</span>}
      </legend>

      {productCurrentSpecs.length > 0 && getSpecsFields()}
    </fieldset>
  );
}

function RelatedProductsNames({ data: { initialData = {} }, field: formikField, form: { setFieldValue } }) {
  const [relatedProductNamesList, setRelatedProductNamesList] = useState([]);

  useEffect(() => {
    setFieldValue(formikField.name, relatedProductNamesList.filter(Boolean));
  }, [relatedProductNamesList]);

  const BoundSearchSingleProductByName = useCallback(
    (props) => (
      <SearchSingleProductByName
        {...props}
        list="foundRelatedProductsNames"
        debounceTimeMs={200}
        label={translations.relatedProductName}
        searchingTarget="relatedProductsNames"
        ignoredProductNames={relatedProductNamesList.filter(
          (productName) => productName && props.presetValue !== productName
        )}
        onSelectedProductName={(productName) => {
          if (props.editedProductIndex > -1) {
            props.listFeatures.editItem(productName, props.editedProductIndex);
          } else {
            props.listFeatures.addItem(productName);
          }
        }}
        autoFocus={true}
      />
    ),
    [relatedProductNamesList]
  );

  return (
    <fieldset className="new-product">
      <legend>{translations.relatedProductsNames}</legend>

      <FlexibleList
        initialListItems={initialData[formikField.name]}
        newItemComponent={(listFeatures) => <BoundSearchSingleProductByName listFeatures={listFeatures} />}
        editItemComponent={(relatedProductName, index, listFeatures) => (
          <BoundSearchSingleProductByName
            presetValue={relatedProductName}
            editedProductIndex={index}
            listFeatures={listFeatures}
          />
        )}
        emitUpdatedItemsList={setRelatedProductNamesList}
      />

      <input {...formikField} type="hidden" />
    </fieldset>
  );
}

const ProductForm = ({ initialData = {}, doSubmit }) => {
  const [productCurrentSpecs, setProductCurrentSpecs] = useState([]);
  const productSpecsMap = useRef({
    specs: null,
    categoryToSpecs: null,
  });
  const [formInitials, setFormInitials] = useState(() =>
    Object.fromEntries(ProductForm.initialFormKeys.map((key) => [key, initialData[key] || '']))
  );
  const ORIGINAL_FORM_INITIALS_KEYS = useMemo(() => Object.keys(formInitials), []);
  const getSpecsForSelectedCategory = useCallback((selectedCategoryName) => {
    const specsFromChosenCategory = (
      productSpecsMap.current.categoryToSpecs.find(
        (categoryToSpec) => categoryToSpec.category === selectedCategoryName
      ) || { specs: [] }
    ) /* TODO: remove fallback when CategoriesTree will handle ignoring toggle'able nodes */.specs;

    return productSpecsMap.current.specs.filter((spec) => specsFromChosenCategory.includes(spec.name));
  }, []);
  const getNestedEntries = useMemo(() => {
    const _getNestedEntries = (entries) =>
      (Array.isArray(entries) ? entries : Object.entries(entries))
        .filter(([key]) => key.includes(SPEC_NAMES_SEPARATORS.LEVEL))
        .reduce((obj, [key, value]) => {
          const nestLevelKeys = key.split(SPEC_NAMES_SEPARATORS.LEVEL);

          _getNestedEntries.createNestedProperty(obj, nestLevelKeys, value);

          return obj;
        }, Object.create(null));

    _getNestedEntries.createNestedProperty = (obj, nestLevelKeys, value, currentLevel = 0) => {
      const currentLevelKey = nestLevelKeys[currentLevel];
      const normalizedCurrentLevelKey = currentLevelKey.replaceAll(
        SPEC_NAMES_SEPARATORS.GAP,
        SPEC_NAMES_SEPARATORS.SPACE
      );
      const nextLevel = currentLevel + 1;

      if (!(currentLevelKey in obj)) {
        if (currentLevel === 0) {
          obj[currentLevelKey] = {};
        } else if (currentLevel === 1) {
          obj[normalizedCurrentLevelKey] = {
            value: {},
            defaultUnit: undefined,
          };

          const specWithDefaultUnit = productSpecsMap.current.specs.find(
            (specObj) => specObj.fieldName === currentLevelKey && specObj.defaultUnit
          );

          if (specWithDefaultUnit) {
            obj[normalizedCurrentLevelKey].defaultUnit = specWithDefaultUnit.defaultUnit;
          }
        }
      }

      if (nestLevelKeys[nextLevel]) {
        _getNestedEntries.createNestedProperty(obj[currentLevelKey], nestLevelKeys, value, nextLevel);
      } else {
        if (currentLevel > 1) {
          obj.value[normalizedCurrentLevelKey] = value;
        } else {
          const isSpecWithChoiceType = productSpecsMap.current.specs.some(
            (specObj) => specObj.name === currentLevelKey && specObj.type === 'CHOICE'
          );

          obj[normalizedCurrentLevelKey].value = isSpecWithChoiceType ? [value] : value;
        }
      }
    };

    return _getNestedEntries;
  }, []);

  useEffect(() => {
    (async () => {
      const productSpecifications = await productSpecsService
        .getProductsSpecifications()
        .then(productSpecsService.structureProductsSpecifications);

      productSpecsMap.current.categoryToSpecs = productSpecifications.categoryToSpecs;
      productSpecsMap.current.specs = productSpecifications.specs.map((specObj) => ({
        ...specObj,
        fieldName: swapSpaceForGap(specObj.name),
        fieldType: FIELD_TYPE_MAP[specObj.type],
      }));

      setFormInitials((prevFormInitials) => ({
        ...prevFormInitials,
        ...Object.fromEntries(
          productSpecsMap.current.specs.reduce((specEntries, spec) => {
            const names = spec.descriptions
              ? spec.descriptions.map((description) => `${spec.fieldName}${SPEC_NAMES_SEPARATORS.LEVEL}${description}`)
              : [spec.fieldName];

            names.forEach((name) => {
              specEntries.push([name, '']);
            });

            return specEntries;
          }, [])
        ),
      }));
    })();
  }, []);

  const filterOutUnrelatedFields = (values) => {
    const specFieldNamesForSelectedCategory = getSpecsForSelectedCategory(values.category).reduce(
      (specEntries, spec) => {
        const names = spec.descriptions
          ? spec.descriptions.map(
              (description) =>
                `${FIELD_NAME_PREFIXES.TECHNICAL_SPECS}${spec.fieldName}${SPEC_NAMES_SEPARATORS.LEVEL}${description}`
            )
          : [`${FIELD_NAME_PREFIXES.TECHNICAL_SPECS}${spec.fieldName}`];

        names.forEach((name) => {
          specEntries.push(name);
        });

        return specEntries;
      },
      []
    );
    const filteredValues = Object.entries(values).filter(([key]) =>
      specFieldNamesForSelectedCategory.some((fieldName) => fieldName === key)
    );
    const filteredFormInitials = Object.entries(values).filter(([key]) => ORIGINAL_FORM_INITIALS_KEYS.includes(key));

    return Object.fromEntries([...filteredFormInitials, ...filteredValues]);
  };

  const normalizeSubmittedValues = (values) => {
    const entries = Object.entries(values);
    const entriesWithNaturalKeys = entries.filter(([key]) => !key.includes(SPEC_NAMES_SEPARATORS.LEVEL));
    const nestedEntries = getNestedEntries(entries);

    const normalizedValues = {
      ...Object.fromEntries(entriesWithNaturalKeys),
      ...nestedEntries,
    };
    normalizedValues.technicalSpecs = Object.entries(normalizedValues.technicalSpecs).map(
      ([key, { value, defaultUnit }]) => ({
        heading: key,
        data: value,
        defaultUnit,
      })
    );

    return normalizedValues;
  };

  const onSubmitHandler = (values, { setSubmitting }) => {
    const isProductModification = Object.keys(initialData).length > 0;
    let submission;

    if (isProductModification) {
      submission = doSubmit(values, normalizeSubmittedValues(filterOutUnrelatedFields(values)).technicalSpecs);
    } else {
      const newProductData = normalizeSubmittedValues(filterOutUnrelatedFields(values));
      submission = doSubmit(newProductData);
    }

    submission
      .catch((errorMessage) => {
        console.error('Submission error:', errorMessage);
      })
      .finally(() => setSubmitting(false));
  };

  const validateHandler = (values) => {
    const errors = {};

    if (!values.category) {
      errors.category = translations.emptyCategoryError;
    }

    const { isColourFieldError, colourFieldKey } = validateHandler.colorFieldTextValidator(values);
    if (isColourFieldError) {
      errors[colourFieldKey] = translations.colourIsNotTextError;
    }

    return errors;
  };
  validateHandler.colorFieldTextValidator = (values) => {
    const colourFieldKey = `${FIELD_NAME_PREFIXES.TECHNICAL_SPECS}colour`;
    const isColorFieldText = /^\D+$/.test(values[colourFieldKey]);

    return { isColourFieldError: !isColorFieldText, colourFieldKey };
  };

  return (
    <section>
      <Formik onSubmit={onSubmitHandler} initialValues={formInitials} validate={validateHandler}>
        {({ handleSubmit, ...formikRestProps }) => (
          <form onSubmit={handleSubmit}>
            <h2>{translations.intro}</h2>

            <BaseInfo
              data={{ initialData: formikRestProps.values }}
              methods={{ handleChange: formikRestProps.handleChange, handleBlur: formikRestProps.handleBlur }}
            />
            <Field
              name="shortDescription"
              data={{ initialData: formikRestProps.values }}
              component={ShortDescription}
            />
            {Object.values(productSpecsMap.current).filter(Boolean).length && (
              <CategorySelector
                data={{ initialData: formikRestProps.values }}
                methods={{ setProductCurrentSpecs, getSpecsForSelectedCategory }}
              />
            )}
            <TechnicalSpecs
              data={{ productCurrentSpecs, initialData: initialData.technicalSpecs }}
              methods={{ handleChange: formikRestProps.handleChange, setFieldValue: formikRestProps.setFieldValue }}
            />
            <Field
              name="relatedProductsNames"
              data={{ initialData: formikRestProps.values }}
              component={RelatedProductsNames}
            />

            <button
              type="submit"
              onClick={() => !formikRestProps.touched.category && formikRestProps.setFieldTouched('category')}
            >
              {translations.save}
            </button>
          </form>
        )}
      </Formik>
    </section>
  );
};
ProductForm.initialFormKeys = ['name', 'price', 'shortDescription', 'category', 'relatedProductsNames'];

const NewProduct = () => {
  const doSubmit = (newProductData) =>
    httpService.addProduct(newProductData).then((res) => {
      if (res.__EXCEPTION_ALREADY_HANDLED) {
        return;
      }

      console.log('Product successfully saved');
    });

  return <ProductForm doSubmit={doSubmit} />;
};
const ModifyProduct = () => {
  const productName = useLocation().state;
  const [productData, setProductData] = useState(null);
  const [modificationError, setModificationError] = useState(false);
  const getChangedFields = useCallback(
    (values) => {
      const flatTechnicalSpecs = productData.technicalSpecs.reduce((output, spec) => {
        const obj = {};
        const PREFIX = `${FIELD_NAME_PREFIXES.TECHNICAL_SPECS}${swapSpaceForGap(spec.heading)}`;

        if (typeof spec.data === 'object' && !Array.isArray(spec.data)) {
          Object.entries(spec.data).forEach(([key, value]) => {
            obj[`${PREFIX}${SPEC_NAMES_SEPARATORS.LEVEL}${key}`] = value;
          });
        } else if (Array.isArray(spec.data)) {
          obj[PREFIX] = spec.data.join(', ');
        } else {
          obj[PREFIX] = spec.data;
        }

        return {
          ...output,
          ...obj,
        };
      }, {});

      const normalizedInitialProductData = { ...productData, ...flatTechnicalSpecs };
      delete normalizedInitialProductData.technicalSpecs;

      const changedFields = Object.entries(values).filter(([key, value]) => {
        if (Array.isArray(value)) {
          return normalizedInitialProductData[key].toString() !== value.toString();
        }

        return normalizedInitialProductData[key] !== value;
      });

      return changedFields;
    },
    [productData]
  );

  useEffect(() => {
    // TODO: implement `getProductByName` method instead of (or along with) `getProduct[ById]`
    httpService.getProductsByNames([productName]).then((res) => {
      if (res.__EXCEPTION_ALREADY_HANDLED) {
        return;
      }

      setProductData(res[0]);
    });
  }, []);

  const normalizeTechnicalSpecsProps = (changedFields, technicalSpecsField) => {
    const fieldEntriesWithoutTechnicalSpecs = changedFields.filter(
      ([key]) => !key.startsWith(FIELD_NAME_PREFIXES.TECHNICAL_SPECS)
    );

    if (fieldEntriesWithoutTechnicalSpecs.length === changedFields.length) {
      return changedFields;
    }

    const technicalSpecsEntry = ['technicalSpecs', technicalSpecsField];
    return [...fieldEntriesWithoutTechnicalSpecs, technicalSpecsEntry];
  };

  const doSubmit = (values, technicalSpecsField) => {
    const changedFields = normalizeTechnicalSpecsProps(getChangedFields(values), technicalSpecsField);

    if (changedFields.length) {
      setModificationError(false);

      return httpService.modifyProduct(values.name, Object.fromEntries(changedFields)).then((res) => {
        if (res.__EXCEPTION_ALREADY_HANDLED) {
          return;
        }

        setProductData(res);
      });
    }

    setModificationError(true);
    return Promise.reject('modify impossible, due to not changed data');
  };

  return productData ? (
    <>
      <ProductForm initialData={productData} doSubmit={doSubmit} />
      {modificationError && <FormFieldError>{translations.modificationError}</FormFieldError>}
    </>
  ) : (
    translations.lackOfData
  );
};

export { NewProduct, ModifyProduct };
