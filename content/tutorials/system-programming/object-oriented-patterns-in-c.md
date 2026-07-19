---
title: Object-Oriented Patterns in C
description: >-
  C has no class keyword, no inheritance, no virtual dispatch — and yet embedded
  C codebases reimplement all three constantly, because the underlying need
  (model a peripheral once, reuse the model…
order: 12
tags:
  - systems
draft: false
author: abdallah-shehawey
---
C has no `class` keyword, no inheritance, no virtual dispatch — and yet embedded C codebases reimplement all three constantly, because the underlying need (model a peripheral once, reuse the model across several sensors, swap behavior without an if/else ladder everywhere) doesn't go away just because the language is C. This walks through the same small ADC/sensor example built three ways: plain encapsulation, composition-based "inheritance," and function-pointer-based polymorphism.

## 1. Abstraction & encapsulation: a struct as an object, an `_construct()` as a constructor

The `Adc_t` type models an ADC peripheral as a struct whose fields are mostly **function pointers**, populated once at construction:

```c
typedef struct adc Adc_t;

struct adc {
    AdcRegs_t* regs;
    void (*init)(Adc_t* obj);
    unsigned int (*readValue)(Adc_t* obj);
    void (*setCtrlAddress)(Adc_t* obj, unsigned int* ctrlRegAddr);
    // ...
};

Adc_t* adc_construct(unsigned int* ctrlRegAddr, unsigned int* statusRegAddr, unsigned int* dataRegAddr);
void adc_destruct(Adc_t* obj);
```

The constructor allocates the object and its private register-address struct, then wires up every method pointer to the real implementation:

```c
Adc_t* adc_construct(unsigned int* ctrlRegAddr, unsigned int* statusRegAddr, unsigned int* dataRegAddr)
{
    Adc_t* obj = (Adc_t*) malloc(sizeof(Adc_t));
    AdcRegs_t* regs = (AdcRegs_t*) malloc(sizeof(AdcRegs_t));
    regs->ctrlRegAddr = ctrlRegAddr;
    // ...
    obj->regs      = regs;
    obj->init      = adc_init;
    obj->readValue = adc_readValue;
    // ...
    return obj;
}
```

The call site never calls `adc_init(obj)` directly — it calls **through the object**:

```c
Adc_t* adcObjs[NUMBER_OF_ADCS];
adcObjs[0] = adc_construct(ADC0_CTRL_REG, ADC0_STATUS_REG, ADC0_DATA_REG);
adcObjs[0]->init(adcObjs[0]);
unsigned int v = adcObjs[0]->readValue(adcObjs[0]);
```

`obj->init(obj)` is C's version of `obj.init()` — the object always has to be passed explicitly as the first argument, because C has no implicit `this`.

**Encapsulation** comes from two things working together: `adc_init`, `adc_readValue`, and the register-address getters are declared `static` in `adc.c`, so they're invisible to any other translation unit — the only way to reach them from outside is through the function-pointer fields the constructor wired up. And the real register addresses live inside a private `AdcRegs_t` the header doesn't expose the internals of, reachable only via the `set*Address`/`get*Address` methods, which validate the address is in range before accepting it:

```c
void setCtrlAddress(Adc_t* obj, unsigned int* ctrlRegAddr) {
    if (ctrlRegAddr < ADC_ADDR_SPACE_START || ctrlRegAddr > ADC_ADDR_SPACE_END) {
        printf("Invalid control register address\nRegister is not set!\n");
        return;
    }
    obj->regs->ctrlRegAddr = ctrlRegAddr;
}
```

## 2. Inheritance via composition

C can't extend a struct the way a class extends a base class, but it can **embed** one struct inside another and delegate to it — composition standing in for inheritance:

```c
typedef struct temperatureSensor TemperatureSensor_t;

struct temperatureSensor {
    Adc_t* adcParentObj;                              // "is-a" relationship, held by pointer
    float (*readConvertedValue)(TemperatureSensor_t* obj);
};
```

```c
static float readConvertedTemperatureValue(TemperatureSensor_t* obj)
{
    return (obj->adcParentObj->readValue(obj->adcParentObj) * 9/5) + 32;
}

TemperatureSensor_t* temperatureSensor_construct(unsigned int* ctrlRegAddr, unsigned int* statusRegAddr, unsigned int* dataRegAddr)
{
    TemperatureSensor_t* obj = (TemperatureSensor_t*) malloc(sizeof(TemperatureSensor_t));
    obj->adcParentObj = adc_construct(ctrlRegAddr, statusRegAddr, dataRegAddr);   // build the "parent" object
    obj->readConvertedValue = readConvertedTemperatureValue;
    return obj;
}
```

`TemperatureSensor_t` doesn't inherit `Adc_t`'s methods automatically — it holds a *pointer* to a fully-constructed `Adc_t` and explicitly forwards to it (`obj->adcParentObj->readValue(...)`) wherever it needs the base behavior, then layers its own conversion math (raw ADC counts → Fahrenheit) on top. `voltageSensor` in the same example follows the identical shape with its own conversion formula — this is the "has-a, and forwards to it" pattern that stands in for "is-a" in C.

## 3. Polymorphism: one field, different behavior per instance

The composition approach above still requires the caller to know it's holding a `TemperatureSensor_t*` versus a `VoltageSensor_t*` to call the right conversion function. The polymorphism variant collapses that: it adds a **generic function-pointer field directly onto the base `Adc_t` struct** and lets each derived constructor decide what that field points to:

```c
typedef float (*readConvertedValueType)(Adc_t* obj);

struct adc {
    AdcRegs_t* regs;
    void (*init)(Adc_t* obj);
    unsigned int (*readValue)(Adc_t* obj);
    readConvertedValueType readConvertedValue;   // <-- the polymorphic slot
};

Adc_t* adc_construct(unsigned int* ctrlRegAddr, unsigned int* statusRegAddr,
                      unsigned int* dataRegAddr, readConvertedValueType readConvertedValue);
```

Each sensor type supplies its own implementation of that one slot at construction time:

```c
// temperatureSensor.c
static float readConvertedTemperatureValue(Adc_t* obj) {
    return (obj->readValue(obj) * 9/5) + 32;
}
obj->adcParentObj = adc_construct(ctrlRegAddr, statusRegAddr, dataRegAddr,
                                    readConvertedTemperatureValue);
```

```c
// voltageSensor.c
static float readConvertedVoltageValue(Adc_t* obj) {
    return (obj->readValue(obj) / 1000.0);
}
obj->adcParentObj = adc_construct(ctrlRegAddr, statusRegAddr, dataRegAddr,
                                    readConvertedVoltageValue);
```

Now the call site can treat every sensor as "just an `Adc_t*`" and call the **same field name** without caring which concrete sensor it actually is:

```c
Adc_t* adcObjs[NUMBER_OF_ADCS];
adcObjs[0] = tempObjs[0]->adcParentObj;    // was built with the temperature conversion
adcObjs[5] = voltObjs[0]->adcParentObj;    // was built with the voltage conversion

for (int i = 0; i < NUMBER_OF_ADCS; i++) {
    float reading = adcObjs[i]->readConvertedValue(adcObjs[i]);   // dispatches differently per object
    uart_transmit(&reading, FLOAT);
}
```

`adcObjs[i]->readConvertedValue(adcObjs[i])` is exactly what a C++ vtable call compiles down to under the hood: an indirect call through a per-object function pointer, chosen at construction time rather than resolved by the compiler at the call site. This is the whole trick — the loop above has no `if (isTemperature) ... else if (isVoltage) ...` anywhere; the correct behavior is already baked into the pointer each object was constructed with.
