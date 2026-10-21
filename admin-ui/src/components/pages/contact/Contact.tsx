import React from 'react';
import { Icon } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { HOME } from '../../Routes';

const COMPANY_NAME: string = 'Pulsar Games';
const COMPANY_EMAIL: string = 'math_mercier@hotmail.fr';

export default function Contact() {
  const navigate = useNavigate();

  return (
    <div className="contact">
      <header className="rules__header">
        <button
          type="button"
          className="rules__back"
          onClick={() => navigate(HOME)}
          aria-label="Retour à l'accueil"
        >
          <Icon>arrow_back</Icon>
        </button>
        <h1 className="rules__title">Contact</h1>
      </header>
      <div className="contact__content">
        <p className="contact__company">{COMPANY_NAME}</p>
        <a className="contact__email" href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
      </div>
    </div>
  );
}
