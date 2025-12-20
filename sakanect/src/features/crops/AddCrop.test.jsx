import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AddCrop from './AddCrop';

describe('AddCrop Form Logic', () => {
  
  it('shows price input by default (For Sale)', () => {
    render(<AddCrop />);
    // "For Sale" is default, so Price input should exist
    expect(screen.getByText(/Price per Kg/i)).toBeInTheDocument();
  });

  it('hides price input when Donation is selected', () => {
    render(<AddCrop />);
    
    // Click the "Donation" radio button
    const donationRadio = screen.getByLabelText('Donation');
    fireEvent.click(donationRadio);

    // Price input should disappear
    expect(screen.queryByText(/Price per Kg/i)).not.toBeInTheDocument();
  });

  it('validates required fields', () => {
    render(<AddCrop />);
    
    // Click submit without filling anything
    const submitBtn = screen.getByText(/Post Listing/i);
    fireEvent.click(submitBtn);

    // HTML5 validation should trigger (inputs have 'required' attribute)
    const titleInput = screen.getByPlaceholderText(/e.g. Fresh Tomatoes/i);
    expect(titleInput).toBeInvalid();
  });
});