
import React from 'react';
import { render, screen } from '@testing-library/react';
import DesktopLanding from '../src/components/landing/desktop-landing';

describe('DesktopLanding', () => {
  it('renders the main heading', () => {
    render(<DesktopLanding />);
    
    const heading = screen.getByText(/Inscreva-se no/i);
    expect(heading).toBeInTheDocument();
  });
});
