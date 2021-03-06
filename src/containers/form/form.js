import className from 'classnames';
import PropTypes from 'prop-types';
import React, { Component } from 'react';

import Button from '../../components/form-components/button';
import componentMapDefault from '../../constants/component-map';
import { formComponentMapShape, formDataShape } from '../../constants/shapes';
import { generateFormValues } from '../../lib/form-utils';
import { builtInValidators } from '../../constants/validators';

const translateOptions = (opts, getTranslation) => {
  return opts.map((opt) => {
    return {
      ...opt,
      label: getTranslation(opt.label || ''),
    };
  });
};

const Form = ({
  ButtonComponent,
  buttonProps,
  componentMap,
  errors,
  formData,
  getTranslation,
  submitLabel,
  values,
  onFieldChange,
  onKeyDown,
  onSubmit
}) => (
  <div className="amped-form">
    { formData.fields.map((row, r) => {
      const size = Math.floor(12 / row.length);
      const gridClasses = className(
        'amped-form__grid',
        `amped-form__grid--${row.length}`,
      );
      return (
        <div className={gridClasses} key={r}>
          { row.map((col, i) => {
            if (typeof col.show === 'function' && values && !col.show(values)) {
              return null;
            }
            const elem = componentMap[col.type || 'text'];
            if (!elem) {
              console.error(`Component for ${col.type} not found. Check your formData and componentMap`);
              return null;
            }
            const ElemComponent = elem.component;
            const handleChange = (fieldVal) => {
              // const _value
              let _value = fieldVal;

              if (elem.formatter) {
                _value = elem.formatter(fieldVal);
              }

              onFieldChange(col.name, _value, col.label);
            };
            const handleKeyDown = onKeyDown.bind(this, col.name);
            const elemProps = {
              ...col.props || {},
              ...elem.props || {}
            };

            if (errors[col.name]) {
              elemProps.errors = errors[col.name];
            }

            let props = {
              disabled: col.disabled,
              id: `form-component-${col.name}`,
              label: getTranslation(col.label),
              name: col.name,
              value: values && values[col.name] ?
                (col.type === 'text' ? values[col.name].toString() : values[col.name]) : '',
              onChange: handleChange,
              onKeyDown: handleKeyDown,
              ...elemProps
            };

            // if (elem.propsFromValues) {
            //   props = {
            //     ...props,
            //     ...elem.propsFromValues(values)
            //   }
            // }
            //
            // console.log('ELEM', elem, props);

            if (col.options) {
              props.options = col.options;
            }

            if (props.options) {
              props.options = translateOptions(props.options, getTranslation);
            }

            if (props.value && typeof props.value === 'string') {
              try {
                const json = JSON.parse(props.value);
                props.value = JSON.stringify(translateOptions(json, getTranslation));
              } catch (e) { }
            }

            return (
              <div className="amped-form__cell" size={size} key={i}>
                <ElemComponent {...props} />
              </div>
            );
          })}
        </div>
      );
    })}
    <div className="form-builder__actions">
      { ButtonComponent && (
        <ButtonComponent
          primary
          onClick={onSubmit}
          {...buttonProps}
        >
          {getTranslation(submitLabel)}
        </ButtonComponent>
      )}
    </div>
  </div>
);

Form.propTypes = {
  ButtonComponent: PropTypes.func,
  buttonProps: PropTypes.object,
  componentMap: formComponentMapShape,
  formData: formDataShape.isRequired, // eslint-disable-line
  getTranslation: PropTypes.func,
  submitLabel: PropTypes.oneOfType([
    PropTypes.element,
    PropTypes.string
  ]),
  values: PropTypes.object,
  onFieldChange: PropTypes.func,
  onKeyDown: PropTypes.func,
  onSubmit: PropTypes.func
};

Form.defaultProps = {
  ButtonComponent: Button,
  buttonProps: {},
  componentMap: componentMapDefault,
  getTranslation: null,
  submitLabel: 'Save',
  values: null,
  onFieldChange: () => {},
  onKeyDown: () => {},
  onSubmit: () => {}
};

class FormContainer extends Component {

  static propTypes = {
    ButtonComponent: PropTypes.func,
    buttonProps: PropTypes.object,
    componentMap: PropTypes.object, //@TODO xxxTed Needs a shape definition
    emptyOnSubmit: PropTypes.bool,
    formData: PropTypes.object.isRequired, //@TODO xxxTed Needs a shape definition
    formValues: PropTypes.object,
    getTranslation: PropTypes.func,
    submitLabel: PropTypes.oneOfType([
      PropTypes.element,
      PropTypes.string
    ]),
    submitOnEnter: PropTypes.bool,
    onChange: PropTypes.func,
    onSubmit: PropTypes.func,
    onValuesGenerates: PropTypes.func
  };

  static defaultProps = {
    ButtonComponent: Button,
    buttonProps: {},
    componentMap: componentMapDefault,
    emptyOnSubmit: false,
    formValues: null,
    getTranslation: (text) => {
      return text;
    },
    submitLabel: 'Save',
    submitOnEnter: true,
    onChange: null,
    onSubmit: () => {},
    onValuesGenerates: () => {}
  };

  constructor(props) {
    super(props);

    this.state = {
      errors: {},
      values: this.props.formValues ?
        this.props.formValues : this.generateValues(this.props.formData),
      flattenedData: this.props.formData && this.props.formData.fields && this.props.formData.fields.flat(),
    };

    this.checkForErrors = this.checkForErrors.bind(this);
    this.handleFieldChange = this.handleFieldChange.bind(this);
    this.handleFormSubmit = this.handleFormSubmit.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.formValues && this.state.values !== nextProps.formValues) {
      this.setState(() => ({
        values: nextProps.formValues
      }));
    }
  }

  checkForErrors() {
    const {
      values
    } = this.state;
    return this.state.flattenedData.reduce((acc, field) => {
      const {
        name,
        required,
        validators
      } = field;

      if (required) {
        return validators.reduce((errAcc, validateKey) => {
          let validateFunc;
          if (typeof validateKey === 'function') {
            validateFunc = validateKey(values[name]);
          } else if (typeof validateKey === 'string' && builtInValidators[validateKey]) {
            validateFunc = builtInValidators[validateKey];
          }

          if (validateFunc) {
            const errorMessage = validateFunc(values[name]);
            if (errorMessage) {
              if (!errAcc[name]) {
                errAcc[name] = []
              }
              errAcc[name].push(errorMessage)
            }
          }

          return errAcc;
        }, acc)
      }

      return acc;
    }, {});
  }

  generateValues(data) {
    const values = generateFormValues(data);

    this.props.onValuesGenerates(null, null, values);
    return values;
  }

  handleFieldChange(name, value, label) {
    const values = {
      ...this.state.values,
      [name]: value
    };
    if (this.props.onChange) {
      this.props.onChange(name, value, values, label);
    }
    this.setState(() => ({
      values
    }));
  }

  handleFormSubmit() {
    const errors = this.checkForErrors();

    if (Object.keys(errors).length === 0) {
      this.props.onSubmit({
        ...(this.props.formData.hiddenFields || {}),
        ...this.state.values
      });
      if (this.props.emptyOnSubmit) {
        const values = Object.keys(this.state.values).reduce((ret, name) => ({
          ...ret,
          [name]: ''
        }), {});
        this.setState(() => ({
          errors: {},
          values,
        }));
      } else {
        this.setState(() => ({
          errors: {},
        }))
      }
    } else {
      this.setState(() => ({
        errors,
      }))
    }
  }

  handleKeyDown(fieldData, evt) {
    if (this.props.submitOnEnter && evt.which === 13) {
      this.props.onSubmit(this.state.values);
    }
  }

  render() {
    return (
      <Form
        ButtonComponent={this.props.ButtonComponent}
        buttonProps={this.props.buttonProps}
        componentMap={this.props.componentMap}
        errors={this.state.errors}
        formData={this.props.formData}
        getTranslation={this.props.getTranslation}
        submitLabel={this.props.submitLabel}
        values={this.state.values}
        onFieldChange={this.handleFieldChange}
        onKeyDown={this.handleKeyDown}
        onSubmit={this.handleFormSubmit}
      />
    );
  }
}

export default FormContainer;
