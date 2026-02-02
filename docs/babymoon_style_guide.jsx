import React, { useState } from 'react';
import { Mail, MailOpen, CheckCircle, Heart, MinusCircle, XCircle, Music, Camera, Settings, Lock, Key, ArrowLeft, RefreshCw } from 'lucide-react';

export default function BabymoonStyleGuide() {
  const [activeTab, setActiveTab] = useState('colors');
  const [envelopeState, setEnvelopeState] = useState('sealed');
  const [inputValue, setInputValue] = useState('');
  const [voteSelection, setVoteSelection] = useState(null);

  const tabs = [
    { id: 'colors', label: 'Colors' },
    { id: 'typography', label: 'Typography' },
    { id: 'components', label: 'Components' },
    { id: 'envelopes', label: 'Envelopes' },
    { id: 'animations', label: 'Motion' },
  ];

  const colors = {
    primary: [
      { name: 'Sunrise Gold', hex: '#F4A261', usage: 'Primary accent, CTAs' },
      { name: 'Warm Sand', hex: '#FAF3E8', usage: 'Primary background' },
      { name: 'Dusk Rose', hex: '#E07A5F', usage: 'Secondary accent' },
      { name: 'Deep Terracotta', hex: '#BC6C4A', usage: 'Hover states' },
      { name: 'Soft Sage', hex: '#9DB5A0', usage: 'Success states' },
    ],
    neutral: [
      { name: 'Warm Charcoal', hex: '#3D3A38', usage: 'Primary text' },
      { name: 'Soft Graphite', hex: '#6B6662', usage: 'Secondary text' },
      { name: 'Muted Stone', hex: '#A8A29E', usage: 'Disabled, hints' },
      { name: 'Cream', hex: '#FFFEF9', usage: 'Card backgrounds' },
      { name: 'Light Linen', hex: '#F5F1EB', usage: 'Borders, dividers' },
    ],
  };

  const fontDisplay = 'Fraunces, Georgia, serif';
  const fontBody = 'Source Sans 3, -apple-system, BlinkMacSystemFont, sans-serif';
  const fontMono = 'JetBrains Mono, monospace';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #FAF3E8 0%, #FFFEF9 50%, #FAF3E8 100%)',
      fontFamily: fontBody,
      color: '#3D3A38',
      padding: '2rem',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <h1 style={{
            fontFamily: fontDisplay,
            fontSize: '2.5rem',
            fontWeight: 600,
            marginBottom: '0.5rem',
            color: '#3D3A38',
          }}>
            Babymoon Style Guide
          </h1>
          <p style={{ color: '#6B6662', fontSize: '1.125rem' }}>
            Golden Hour Intimacy — Interactive Design Reference
          </p>
        </header>

        <nav style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '0.75rem',
                border: 'none',
                background: activeTab === tab.id ? '#F4A261' : 'transparent',
                color: activeTab === tab.id ? '#3D3A38' : '#6B6662',
                fontFamily: 'inherit',
                fontSize: '1rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <main>
          {activeTab === 'colors' && (
            <div>
              <section style={{ marginBottom: '3rem' }}>
                <h2 style={{
                  fontFamily: fontDisplay,
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  marginBottom: '1.5rem',
                }}>
                  Primary Palette
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '1rem',
                }}>
                  {colors.primary.map((color) => (
                    <div
                      key={color.hex}
                      style={{
                        background: '#FFFEF9',
                        borderRadius: '1rem',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(61,58,56,0.04), 0 4px 12px rgba(61,58,56,0.06)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      }}
                    >
                      <div style={{
                        height: '80px',
                        background: color.hex,
                      }} />
                      <div style={{ padding: '1rem' }}>
                        <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{color.name}</p>
                        <p style={{ fontFamily: fontMono, fontSize: '0.875rem', color: '#6B6662' }}>
                          {color.hex}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#A8A29E', marginTop: '0.5rem' }}>
                          {color.usage}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2 style={{
                  fontFamily: fontDisplay,
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  marginBottom: '1.5rem',
                }}>
                  Neutral Palette
                </h2>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '1rem',
                }}>
                  {colors.neutral.map((color) => (
                    <div
                      key={color.hex}
                      style={{
                        background: '#FFFEF9',
                        borderRadius: '1rem',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(61,58,56,0.04), 0 4px 12px rgba(61,58,56,0.06)',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      <div style={{
                        height: '80px',
                        background: color.hex,
                        border: color.hex === '#FFFEF9' || color.hex === '#F5F1EB' ? '1px solid #F5F1EB' : 'none',
                      }} />
                      <div style={{ padding: '1rem' }}>
                        <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{color.name}</p>
                        <p style={{ fontFamily: fontMono, fontSize: '0.875rem', color: '#6B6662' }}>
                          {color.hex}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: '#A8A29E', marginTop: '0.5rem' }}>
                          {color.usage}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'typography' && (
            <div>
              <section style={{
                background: '#FFFEF9',
                borderRadius: '1rem',
                padding: '2rem',
                boxShadow: '0 1px 3px rgba(61,58,56,0.04), 0 4px 12px rgba(61,58,56,0.06)',
                marginBottom: '2rem',
              }}>
                <h2 style={{
                  fontFamily: fontDisplay,
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  marginBottom: '1.5rem',
                }}>
                  Font Families
                </h2>
                
                <div style={{ marginBottom: '2rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#A8A29E', marginBottom: '0.5rem' }}>Display — Fraunces</p>
                  <p style={{
                    fontFamily: fontDisplay,
                    fontSize: '2.25rem',
                    fontWeight: 600,
                    lineHeight: 1.2,
                  }}>
                    Before We Were Three
                  </p>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#A8A29E', marginBottom: '0.5rem' }}>Body — Source Sans 3</p>
                  <p style={{
                    fontFamily: fontBody,
                    fontSize: '1.125rem',
                    lineHeight: 1.625,
                  }}>
                    A babymoon is a special trip taken by expecting parents before their baby arrives. It is a time to celebrate your relationship, reflect on your journey together, and prepare for the beautiful chaos ahead.
                  </p>
                </div>

                <div>
                  <p style={{ fontSize: '0.875rem', color: '#A8A29E', marginBottom: '0.5rem' }}>Mono — JetBrains Mono</p>
                  <p style={{
                    fontFamily: fontMono,
                    fontSize: '2rem',
                    letterSpacing: '0.1em',
                    textAlign: 'center',
                    padding: '1rem',
                    background: '#FAF3E8',
                    borderRadius: '0.75rem',
                  }}>
                    1 2 3 4
                  </p>
                </div>
              </section>

              <section style={{
                background: '#FFFEF9',
                borderRadius: '1rem',
                padding: '2rem',
                boxShadow: '0 1px 3px rgba(61,58,56,0.04), 0 4px 12px rgba(61,58,56,0.06)',
              }}>
                <h2 style={{
                  fontFamily: fontDisplay,
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  marginBottom: '1.5rem',
                }}>
                  Type Scale
                </h2>
                
                {[
                  { size: '3rem', label: '5xl — 48px', sample: 'Reveal', isDisplay: true },
                  { size: '2.25rem', label: '4xl — 36px', sample: 'The Big Moment', isDisplay: true },
                  { size: '1.875rem', label: '3xl — 30px', sample: 'Would You Rather', isDisplay: true },
                  { size: '1.5rem', label: '2xl — 24px', sample: 'Envelope Title', isDisplay: true },
                  { size: '1.25rem', label: 'xl — 20px', sample: 'Section Header', isDisplay: true },
                  { size: '1.125rem', label: 'lg — 18px', sample: 'Body large text', isDisplay: false },
                  { size: '1rem', label: 'base — 16px', sample: 'Default body text', isDisplay: false },
                  { size: '0.875rem', label: 'sm — 14px', sample: 'Small labels and captions', isDisplay: false },
                  { size: '0.75rem', label: 'xs — 12px', sample: 'Tiny helper text', isDisplay: false },
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '1rem',
                    padding: '0.75rem 0',
                    borderBottom: i < 8 ? '1px solid #F5F1EB' : 'none',
                  }}>
                    <span style={{
                      fontSize: '0.75rem',
                      color: '#A8A29E',
                      width: '100px',
                      flexShrink: 0,
                    }}>
                      {item.label}
                    </span>
                    <span style={{
                      fontFamily: item.isDisplay ? fontDisplay : fontBody,
                      fontSize: item.size,
                      fontWeight: item.isDisplay ? 500 : 400,
                    }}>
                      {item.sample}
                    </span>
                  </div>
                ))}
              </section>
            </div>
          )}

          {activeTab === 'components' && (
            <div>
              <section style={{
                background: '#FFFEF9',
                borderRadius: '1rem',
                padding: '2rem',
                boxShadow: '0 1px 3px rgba(61,58,56,0.04), 0 4px 12px rgba(61,58,56,0.06)',
                marginBottom: '2rem',
              }}>
                <h2 style={{
                  fontFamily: fontDisplay,
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  marginBottom: '1.5rem',
                }}>
                  Buttons
                </h2>
                
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                  <button style={{
                    background: '#F4A261',
                    color: '#3D3A38',
                    fontFamily: 'inherit',
                    fontWeight: 500,
                    fontSize: '1rem',
                    letterSpacing: '0.02em',
                    padding: '1rem 2rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    cursor: 'pointer',
                    minHeight: '3rem',
                    transition: 'all 0.15s ease',
                  }}>
                    Primary Button
                  </button>
                  
                  <button style={{
                    background: 'transparent',
                    color: '#3D3A38',
                    fontFamily: 'inherit',
                    fontWeight: 500,
                    fontSize: '1rem',
                    padding: '1rem 2rem',
                    borderRadius: '0.75rem',
                    border: '2px solid #F5F1EB',
                    cursor: 'pointer',
                    minHeight: '3rem',
                    transition: 'all 0.15s ease',
                  }}>
                    Secondary Button
                  </button>

                  <button style={{
                    background: '#A8A29E',
                    color: '#FFFEF9',
                    fontFamily: 'inherit',
                    fontWeight: 500,
                    fontSize: '1rem',
                    padding: '1rem 2rem',
                    borderRadius: '0.75rem',
                    border: 'none',
                    cursor: 'not-allowed',
                    minHeight: '3rem',
                    opacity: 0.6,
                  }}>
                    Disabled
                  </button>
                </div>

                <p style={{ fontSize: '0.875rem', color: '#6B6662' }}>
                  Min height: 48px (touch target) | Border radius: 12px | Font weight: 500
                </p>
              </section>

              <section style={{
                background: '#FFFEF9',
                borderRadius: '1rem',
                padding: '2rem',
                boxShadow: '0 1px 3px rgba(61,58,56,0.04), 0 4px 12px rgba(61,58,56,0.06)',
                marginBottom: '2rem',
              }}>
                <h2 style={{
                  fontFamily: fontDisplay,
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  marginBottom: '1.5rem',
                }}>
                  Vote Buttons (Name Game)
                </h2>
                
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  {[
                    { id: 'love', IconComp: Heart, color: '#F4A261', label: 'Love' },
                    { id: 'maybe', IconComp: MinusCircle, color: '#A8A29E', label: 'Maybe' },
                    { id: 'nope', IconComp: XCircle, color: '#E07A5F', label: 'Nope' },
                  ].map((vote) => (
                    <button
                      key={vote.id}
                      onClick={() => setVoteSelection(vote.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '1.5rem 2rem',
                        borderRadius: '1rem',
                        border: voteSelection === vote.id ? '2px solid ' + vote.color : '2px solid #F5F1EB',
                        background: voteSelection === vote.id ? vote.color + '15' : 'transparent',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        minWidth: '100px',
                      }}
                    >
                      <vote.IconComp
                        size={32}
                        color={voteSelection === vote.id ? vote.color : '#6B6662'}
                        fill={voteSelection === vote.id && vote.id === 'love' ? vote.color : 'none'}
                      />
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        color: voteSelection === vote.id ? vote.color : '#6B6662',
                      }}>
                        {vote.label}
                      </span>
                    </button>
                  ))}
                </div>

                <p style={{ fontSize: '0.875rem', color: '#6B6662', textAlign: 'center' }}>
                  Click to see selected state
                </p>
              </section>

              <section style={{
                background: '#FFFEF9',
                borderRadius: '1rem',
                padding: '2rem',
                boxShadow: '0 1px 3px rgba(61,58,56,0.04), 0 4px 12px rgba(61,58,56,0.06)',
                marginBottom: '2rem',
              }}>
                <h2 style={{
                  fontFamily: fontDisplay,
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  marginBottom: '1.5rem',
                }}>
                  Form Inputs
                </h2>
                
                <div style={{ maxWidth: '400px' }}>
                  <input
                    type="text"
                    placeholder="Enter your name..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    style={{
                      width: '100%',
                      fontFamily: 'inherit',
                      fontSize: '1.125rem',
                      padding: '1rem',
                      border: '2px solid #F5F1EB',
                      borderRadius: '0.75rem',
                      background: '#FFFFFF',
                      color: '#3D3A38',
                      outline: 'none',
                      marginBottom: '1rem',
                      boxSizing: 'border-box',
                    }}
                  />
                  
                  <textarea
                    placeholder="Write your letter here..."
                    rows={4}
                    style={{
                      width: '100%',
                      fontFamily: 'inherit',
                      fontSize: '1.125rem',
                      padding: '1rem',
                      border: '2px solid #F5F1EB',
                      borderRadius: '0.75rem',
                      background: '#FFFFFF',
                      color: '#3D3A38',
                      resize: 'vertical',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </section>

              <section style={{
                background: '#FFFEF9',
                borderRadius: '1rem',
                padding: '2rem',
                boxShadow: '0 1px 3px rgba(61,58,56,0.04), 0 4px 12px rgba(61,58,56,0.06)',
              }}>
                <h2 style={{
                  fontFamily: fontDisplay,
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  marginBottom: '1.5rem',
                }}>
                  Icons (Lucide)
                </h2>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))',
                  gap: '1.5rem',
                }}>
                  {[
                    { IconComp: Mail, label: 'Sealed' },
                    { IconComp: MailOpen, label: 'Opened' },
                    { IconComp: CheckCircle, label: 'Complete' },
                    { IconComp: Heart, label: 'Love' },
                    { IconComp: Music, label: 'Playlist' },
                    { IconComp: Camera, label: 'Photo' },
                    { IconComp: Settings, label: 'Admin' },
                    { IconComp: Lock, label: 'Lock' },
                    { IconComp: Key, label: 'Key' },
                    { IconComp: ArrowLeft, label: 'Back' },
                    { IconComp: RefreshCw, label: 'Retry' },
                  ].map((item) => (
                    <div key={item.label} style={{ textAlign: 'center' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.5rem',
                        background: '#FAF3E8',
                        borderRadius: '0.75rem',
                      }}>
                        <item.IconComp size={24} color="#3D3A38" strokeWidth={1.5} />
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#6B6662' }}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'envelopes' && (
            <div>
              <section style={{
                background: '#FFFEF9',
                borderRadius: '1rem',
                padding: '2rem',
                boxShadow: '0 1px 3px rgba(61,58,56,0.04), 0 4px 12px rgba(61,58,56,0.06)',
                marginBottom: '2rem',
              }}>
                <h2 style={{
                  fontFamily: fontDisplay,
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  marginBottom: '1.5rem',
                }}>
                  Envelope States
                </h2>
                
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                  {['sealed', 'opened', 'completed'].map((state) => (
                    <button
                      key={state}
                      onClick={() => setEnvelopeState(state)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        border: 'none',
                        background: envelopeState === state ? '#F4A261' : '#F5F1EB',
                        color: '#3D3A38',
                        fontFamily: 'inherit',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      {state}
                    </button>
                  ))}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1.5rem',
                }}>
                  <div style={{
                    background: envelopeState === 'completed' ? '#FAF3E8' : '#FFFEF9',
                    borderRadius: '1rem',
                    padding: '1.5rem',
                    boxShadow: envelopeState === 'sealed' 
                      ? '0 4px 12px rgba(61,58,56,0.08), 0 12px 32px rgba(61,58,56,0.12)'
                      : '0 1px 3px rgba(61,58,56,0.04), 0 4px 12px rgba(61,58,56,0.06)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    transform: envelopeState === 'sealed' ? 'translateY(-2px)' : 'none',
                    opacity: envelopeState === 'completed' ? 0.8 : 1,
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '40px',
                      background: 'linear-gradient(180deg, #F5F1EB 0%, transparent 100%)',
                      transform: envelopeState === 'sealed' ? 'scaleY(1)' : 'scaleY(0.3)',
                      transformOrigin: 'top',
                      transition: 'transform 0.3s ease',
                      opacity: envelopeState === 'opened' || envelopeState === 'completed' ? 0.5 : 1,
                    }} />

                    {envelopeState === 'completed' && (
                      <div style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: '#9DB5A0',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <CheckCircle size={18} color="#FFFEF9" />
                      </div>
                    )}

                    <div style={{ paddingTop: '1rem' }}>
                      {envelopeState === 'sealed' ? (
                        <Mail size={32} color="#F4A261" style={{ marginBottom: '1rem' }} />
                      ) : (
                        <MailOpen size={32} color={envelopeState === 'completed' ? '#9DB5A0' : '#6B6662'} style={{ marginBottom: '1rem' }} />
                      )}
                      
                      <h3 style={{
                        fontFamily: fontDisplay,
                        fontSize: '1.25rem',
                        fontWeight: 500,
                        marginBottom: '0.5rem',
                        color: envelopeState === 'completed' ? '#6B6662' : '#3D3A38',
                      }}>
                        Would You Rather #1
                      </h3>
                      <p style={{
                        fontSize: '0.875rem',
                        color: '#A8A29E',
                      }}>
                        Early Days
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h3 style={{
                      fontFamily: fontDisplay,
                      fontSize: '1.25rem',
                      fontWeight: 500,
                      marginBottom: '0.75rem',
                      textTransform: 'capitalize',
                    }}>
                      {envelopeState} State
                    </h3>
                    <ul style={{
                      listStyle: 'none',
                      padding: 0,
                      margin: 0,
                      fontSize: '0.875rem',
                      color: '#6B6662',
                    }}>
                      {envelopeState === 'sealed' && (
                        <>
                          <li style={{ marginBottom: '0.5rem' }}>Full opacity, elevated shadow</li>
                          <li style={{ marginBottom: '0.5rem' }}>Sealed flap visible</li>
                          <li style={{ marginBottom: '0.5rem' }}>Sunrise Gold mail icon</li>
                          <li>Hover: lift effect</li>
                        </>
                      )}
                      {envelopeState === 'opened' && (
                        <>
                          <li style={{ marginBottom: '0.5rem' }}>Flap open (scaled down)</li>
                          <li style={{ marginBottom: '0.5rem' }}>Reduced shadow</li>
                          <li style={{ marginBottom: '0.5rem' }}>Muted mail-open icon</li>
                          <li>Activity in progress</li>
                        </>
                      )}
                      {envelopeState === 'completed' && (
                        <>
                          <li style={{ marginBottom: '0.5rem' }}>Sage green checkmark stamp</li>
                          <li style={{ marginBottom: '0.5rem' }}>Reduced opacity (0.8)</li>
                          <li style={{ marginBottom: '0.5rem' }}>Warm Sand background</li>
                          <li>Settled, minimal shadow</li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>
              </section>

              <section style={{
                background: '#FAF3E8',
                borderRadius: '1rem',
                padding: '2rem',
              }}>
                <h2 style={{
                  fontFamily: fontDisplay,
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  marginBottom: '1.5rem',
                }}>
                  Grid Layout Preview
                </h2>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: '1rem',
                }}>
                  {[
                    { title: 'The Big Reveal', state: 'sealed', IconComp: Lock },
                    { title: 'Would You Rather #1', state: 'completed', IconComp: null },
                    { title: 'Baby Trivia #1', state: 'opened', IconComp: null },
                    { title: 'Letter to Baby', state: 'sealed', IconComp: null },
                    { title: 'Baby Name Game', state: 'sealed', IconComp: null },
                    { title: 'Us, Then and Now', state: 'sealed', IconComp: null },
                  ].map((env, i) => (
                    <div
                      key={i}
                      style={{
                        background: env.state === 'completed' ? '#F5F1EB' : '#FFFEF9',
                        borderRadius: '0.75rem',
                        padding: '1.25rem',
                        boxShadow: env.state === 'sealed' 
                          ? '0 2px 8px rgba(61,58,56,0.1)'
                          : '0 1px 3px rgba(61,58,56,0.04)',
                        position: 'relative',
                        opacity: env.state === 'completed' ? 0.75 : 1,
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease',
                      }}
                    >
                      {env.state === 'completed' && (
                        <CheckCircle 
                          size={16} 
                          color="#9DB5A0" 
                          style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}
                        />
                      )}
                      {env.IconComp ? (
                        <env.IconComp size={24} color="#F4A261" style={{ marginBottom: '0.75rem' }} />
                      ) : env.state === 'sealed' ? (
                        <Mail size={24} color="#F4A261" style={{ marginBottom: '0.75rem' }} />
                      ) : (
                        <MailOpen size={24} color="#A8A29E" style={{ marginBottom: '0.75rem' }} />
                      )}
                      <p style={{
                        fontFamily: fontDisplay,
                        fontSize: '0.9375rem',
                        fontWeight: 500,
                        color: env.state === 'completed' ? '#6B6662' : '#3D3A38',
                        lineHeight: 1.3,
                      }}>
                        {env.title}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'animations' && (
            <div>
              <section style={{
                background: '#FFFEF9',
                borderRadius: '1rem',
                padding: '2rem',
                boxShadow: '0 1px 3px rgba(61,58,56,0.04), 0 4px 12px rgba(61,58,56,0.06)',
                marginBottom: '2rem',
              }}>
                <h2 style={{
                  fontFamily: fontDisplay,
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  marginBottom: '1.5rem',
                }}>
                  Timing Values
                </h2>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1rem',
                }}>
                  {[
                    { name: 'Fast', value: '150ms', use: 'Micro-interactions' },
                    { name: 'Normal', value: '250ms', use: 'Standard transitions' },
                    { name: 'Slow', value: '400ms', use: 'Content reveals' },
                    { name: 'Reveal', value: '800ms', use: 'Dramatic moments' },
                  ].map((timing) => (
                    <div
                      key={timing.name}
                      style={{
                        padding: '1rem',
                        background: '#FAF3E8',
                        borderRadius: '0.75rem',
                      }}
                    >
                      <p style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{timing.name}</p>
                      <p style={{
                        fontFamily: fontMono,
                        fontSize: '0.875rem',
                        color: '#F4A261',
                        marginBottom: '0.5rem',
                      }}>
                        {timing.value}
                      </p>
                      <p style={{ fontSize: '0.75rem', color: '#A8A29E' }}>{timing.use}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section style={{
                background: '#FFFEF9',
                borderRadius: '1rem',
                padding: '2rem',
                boxShadow: '0 1px 3px rgba(61,58,56,0.04), 0 4px 12px rgba(61,58,56,0.06)',
              }}>
                <h2 style={{
                  fontFamily: fontDisplay,
                  fontSize: '1.5rem',
                  fontWeight: 500,
                  marginBottom: '1.5rem',
                }}>
                  Animation Demos
                </h2>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '2rem',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.875rem', color: '#6B6662', marginBottom: '1rem' }}>Fade Up</p>
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        background: '#F4A261',
                        borderRadius: '0.75rem',
                        margin: '0 auto',
                        animation: 'fadeUpDemo 2s ease-out infinite',
                      }}
                    />
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.875rem', color: '#6B6662', marginBottom: '1rem' }}>Pulse (Waiting)</p>
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        background: '#E07A5F',
                        borderRadius: '0.75rem',
                        margin: '0 auto',
                        animation: 'pulseDemo 2s ease-in-out infinite',
                      }}
                    />
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.875rem', color: '#6B6662', marginBottom: '1rem' }}>Scale (Success)</p>
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        background: '#9DB5A0',
                        borderRadius: '0.75rem',
                        margin: '0 auto',
                        animation: 'scaleDemo 1.5s ease-in-out infinite',
                      }}
                    />
                  </div>
                </div>
              </section>
            </div>
          )}
        </main>

        <footer style={{
          marginTop: '3rem',
          paddingTop: '2rem',
          borderTop: '1px solid #F5F1EB',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '0.875rem', color: '#A8A29E' }}>
            Babymoon Design System - Before We Were Three
          </p>
        </footer>
      </div>

      <style>{`
        @keyframes fadeUpDemo {
          0%, 100% {
            opacity: 0;
            transform: translateY(16px);
          }
          20%, 80% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulseDemo {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes scaleDemo {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </div>
  );
}
