import React, { useState } from 'react';
import { Formik, Field } from 'formik';
import { useHistory } from 'react-router-dom';
import apiService from '../../features/apiService';
import Popup, { POPUP_TYPES, getClosePopupBtn } from '../utils/popup';
import FormFieldError from '../utils/formFieldError';

const translations = Object.freeze({
  registerHeader: 'Account registration',
  logInField: 'Login',
  passwordField: 'Password',
  repeatedPasswordField: 'Repeat password',
  submitRegistration: 'Register!',
  email: 'Email',
  accountType: 'Account type',
  clientType: 'Client',
  retailerType: 'Retailer',
  bothPasswordFieldsMustBeEqual: 'Both password fields must be equal!',
  registrationSuccessMsg: `
    Account registered! 
    You need to confirm your account via the link we sent you on email, 
    before you'll be able to log in.
  `.trim(),
  registrationFailureMsg: 'Failed to register new account :(',
  registrationSuccessAltMsg: "Email hasn't arrived yet? Click the button and we will re-send the email again.",
  popupReSendEmail: 'Re-send email',
  popupGoToLogin: 'Go to login',
});

export default function Register() {
  const [formInitials] = useState({
    login: '',
    password: '',
    repeatedPassword: '',
    email: '',
    accountType: '',
  });
  const [popupData, setPopupData] = useState(null);
  const history = useHistory();

  // TODO: [UX] show password related errors independently, based on recently blurred field
  const formValidator = (values) => {
    const errors = {};

    if (values.password && values.repeatedPassword && values.password !== values.repeatedPassword) {
      errors.password = translations.bothPasswordFieldsMustBeEqual;
      errors.repeatedPassword = translations.bothPasswordFieldsMustBeEqual;
    }

    return errors;
  };

  const onSubmitHandler = (values) => {
    console.log('register submit values:', values);

    apiService
      .disableGenericErrorHandler()
      .registerUser({ ...values, repeatedPassword: undefined })
      .then((res) => {
        console.log('register res:', res, ' /typeof res:', typeof res);

        if (res.__EXCEPTION_ALREADY_HANDLED) {
          return;
        } else if (res.__ERROR_TO_HANDLE) {
          setPopupData({
            type: POPUP_TYPES.FAILURE,
            message: translations.registrationFailureMsg,
            buttons: [getClosePopupBtn(setPopupData)],
          });
        } else {
          setPopupData({
            type: POPUP_TYPES.SUCCESS,
            message: translations.registrationSuccessMsg,
            altMessage: translations.registrationSuccessAltMsg,
            buttons: [
              {
                onClick: () => history.push('/log-in'),
                text: translations.popupGoToLogin,
              },
            ],
            altButtons: [
              {
                onClick: () => resendConfirmRegistration(values.email),
                text: translations.popupReSendEmail,
              },
            ],
          });
        }
      });
  };

  // TODO: [PERFORMANCE] set some debounce to limit number of sent requests per time
  const resendConfirmRegistration = (email) => {
    apiService.resendConfirmRegistration(email);
  };

  return (
    <section>
      <Formik onSubmit={onSubmitHandler} validateOnChange={false} validate={formValidator} initialValues={formInitials}>
        {({ handleSubmit, ...formikRestProps }) => (
          <form onSubmit={handleSubmit}>
            <fieldset>
              <legend>
                <h2>{translations.registerHeader}</h2>
              </legend>

              <div>
                <label htmlFor="registrationLogin">{translations.logInField}</label>
                <Field name="login" id="registrationLogin" required />
              </div>

              <div>
                <label htmlFor="registrationPassword">{translations.passwordField}</label>
                {/* TODO: [UX] add feature to temporary preview (unmask) the password field */}
                <Field
                  name="password"
                  id="registrationPassword"
                  type="password"
                  minLength="8"
                  maxLength="20"
                  required
                />

                {formikRestProps.errors.password && <FormFieldError>{formikRestProps.errors.password}</FormFieldError>}
              </div>
              <div>
                <label htmlFor="registrationRepeatedPassword">{translations.repeatedPasswordField}</label>
                <Field
                  name="repeatedPassword"
                  id="registrationRepeatedPassword"
                  type="password"
                  minLength="8"
                  maxLength="20"
                  required
                />

                {formikRestProps.errors.repeatedPassword && (
                  <FormFieldError>{formikRestProps.errors.repeatedPassword}</FormFieldError>
                )}
              </div>

              <div>
                <label htmlFor="registrationEmail">{translations.email}</label>
                <Field name="email" id="registrationEmail" type="email" required />
              </div>

              <div id="accountTypesGroup">{translations.accountType}</div>
              <div role="group" aria-labelledby="accountTypesGroup">
                <label htmlFor="registrationAccountClientType">{translations.clientType}</label>
                <Field
                  name="accountType"
                  id="registrationAccountClientType"
                  type="radio"
                  value={translations.clientType.toLowerCase()}
                  required
                />

                <label htmlFor="registrationAccountRetailerType">{translations.retailerType}</label>
                <Field
                  name="accountType"
                  id="registrationAccountRetailerType"
                  type="radio"
                  value={translations.retailerType.toLowerCase()}
                  required
                />
              </div>

              <button type="submit">{translations.submitRegistration}</button>
            </fieldset>
          </form>
        )}
      </Formik>

      {popupData && <Popup {...popupData} />}
    </section>
  );
}
