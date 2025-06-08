import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';

import { Footer } from './Footer';

const mockSocialLinks = [
  {
    title: 'GitHub',
    href: 'https://github.com/proyecto26',
    icon: undefined,
  },
  {
    title: 'Twitter',
    href: 'https://twitter.com/jdnichollsc',
    icon: undefined,
  },
];

const renderWithRouter = (ui: React.ReactElement) => {
  return render(ui, { wrapper: BrowserRouter });
};

describe('Footer', () => {
  it('should render successfully with required props', () => {
    const { baseElement } = renderWithRouter(<Footer socialLinks={mockSocialLinks} />);
    expect(baseElement).toBeTruthy();
  });

  it('should use default title when not provided', () => {
    renderWithRouter(<Footer socialLinks={mockSocialLinks} />);
    expect(screen.getByText((content) => content.includes('ProjectX'))).toBeInTheDocument();
  });

  it('should use custom title when provided', () => {
    const customTitle = 'Custom Title';
    renderWithRouter(<Footer socialLinks={mockSocialLinks} title={customTitle} />);
    expect(screen.getByText((content) => content.includes(customTitle))).toBeInTheDocument();
  });

  it('should render social links correctly', () => {
    renderWithRouter(<Footer socialLinks={mockSocialLinks} />);
    
    mockSocialLinks.forEach((link) => {
      const linkElement = screen.getByLabelText(link.title);
      expect(linkElement).toBeInTheDocument();
      expect(linkElement).toHaveAttribute('href', link.href);
    });
  });
});
