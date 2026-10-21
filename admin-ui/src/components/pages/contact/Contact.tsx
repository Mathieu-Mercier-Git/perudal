import React from 'react';
import { Icon } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { HOME } from '../../Routes';
import { ActionButton } from '../../theme/action/Actions';
import ActionStyle from '../../../lib/plume-admin-theme/action/ActionStyle';

const COMPANY_NAME: string = 'Pulsar Games';
const COMPANY_EMAIL: string = 'math_mercier@hotmail.fr';

const toucanImage: string = '/assets/images/toucan.png';

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
        <div className="contact__logo">
          <img className="contact__toucan" src={toucanImage} alt="" />
        </div>
        <p className="contact__made-by">Made with ♥ by</p>
        <p className="contact__company">{COMPANY_NAME}</p>

        <div className="contact__card">
          <h2 className="contact__card-title">Une appli à toi ?</h2>
          <p className="contact__card-text">
            Cette application te plaît et tu souhaites développer la tienne ?
            Je peux sûrement t'aider. N'hésite pas à me contacter !
          </p>
          <ActionButton
            style={ActionStyle.PRIMARY}
            onClick={() => { window.location.href = `mailto:${COMPANY_EMAIL}`; }}
          >
            Écris-moi
          </ActionButton>
          <a className="contact__email" href={`mailto:${COMPANY_EMAIL}`}>{COMPANY_EMAIL}</a>
        </div>
      </div>
    </div>
  );
}
