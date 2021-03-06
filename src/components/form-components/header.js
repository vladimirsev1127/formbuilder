import PropTypes from 'prop-types';
import React from 'react';

const Header = ({
  label
}) => (
  <div className="amped-form__header">
    {label}
  </div>
);

Header.propTypes = {
  label: PropTypes.string.isRequired
};

export default Header;
