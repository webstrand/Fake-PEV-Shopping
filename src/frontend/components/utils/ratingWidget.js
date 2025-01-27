import React, { useState } from 'react';

const RATING_NUMBER_INCREASEMENT = 0.5;
const RATING_MAX_VALUE = 5; /* TODO: get this from API */
const CLASS_NAMES = Object.freeze({
  WIDGET: 'rating-widget',
  BUTTON: 'rating-widget__btn',
  ICON: 'rating-widget__icon',
});

export default function RatingWidget({
  presetValue = 0,
  scale = RATING_MAX_VALUE,
  field: formikField,
  form: { setFieldValue } = {},
}) {
  if (Number.parseInt(scale) !== scale) {
    throw TypeError(`'scale' prop must be an integer! Received '${scale}'`);
  }

  const [lastActiveRatingValue, setLastActiveRatingValue] = useState(presetValue);
  const [lastHoverRatingValue, setLastHoverRatingValue] = useState(0);
  const ratingValues = Array(scale * 2)
    .fill(1)
    .map((_, index) => RATING_NUMBER_INCREASEMENT + index / 2);

  const onRatingHover = (ratingValue) => {
    setLastHoverRatingValue(ratingValue);
  };

  const onRatingClick = (ratingValue) => {
    const newRatingValue = ratingValue === lastActiveRatingValue ? 0 : ratingValue;

    setLastActiveRatingValue(newRatingValue);
    setFieldValue(formikField.name, newRatingValue);
  };

  const getRatingsMetadata = (ratingValue, index) => {
    const iconClasses = [CLASS_NAMES.ICON];
    const btnEventHandlers = {};

    if (ratingValue <= lastActiveRatingValue) {
      iconClasses.push(`${CLASS_NAMES.ICON}--active`);
    }

    const isOdd = index % 2 === 1;
    if (isOdd) {
      iconClasses.push(`${CLASS_NAMES.ICON}--odd`);
    }

    if (presetValue) {
      iconClasses.push(`${CLASS_NAMES.ICON}--small`);
    } else {
      iconClasses.push(`${CLASS_NAMES.ICON}--big`);

      if (ratingValue <= lastHoverRatingValue) {
        iconClasses.push(`${CLASS_NAMES.ICON}--hover`);
      }

      btnEventHandlers.onMouseOver = () => onRatingHover(ratingValue);
      btnEventHandlers.onMouseOut = () => onRatingHover(0);
      btnEventHandlers.onClick = () => onRatingClick(ratingValue);
    }

    return { iconClasses, btnEventHandlers };
  };

  return (
    <div className={CLASS_NAMES.WIDGET}>
      {ratingValues.map((ratingValue, index) => {
        const { iconClasses, btnEventHandlers } = getRatingsMetadata(ratingValue, index);

        return (
          <button
            className={CLASS_NAMES.BUTTON}
            {...btnEventHandlers}
            title={ratingValue}
            key={ratingValue}
            type="button"
          >
            <i className={iconClasses.join(' ')}></i>
          </button>
        );
      })}

      {formikField && <input {...formikField} type="hidden" />}
    </div>
  );
}
