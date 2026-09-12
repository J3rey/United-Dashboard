import { Alert } from '../lib/alert.web';
const confirmAction=jest.fn(),cancelAction=jest.fn();
const browser={confirm:jest.fn(),alert:jest.fn()};
beforeEach(()=>{Object.defineProperty(globalThis,'window',{value:browser,configurable:true});jest.clearAllMocks();});
test('cancel never invokes the destructive action',()=>{browser.confirm.mockReturnValue(false);Alert.alert('Delete?','History is lost.',[{text:'Cancel',style:'cancel',onPress:cancelAction},{text:'Delete',style:'destructive',onPress:confirmAction}]);expect(confirmAction).not.toHaveBeenCalled();expect(cancelAction).toHaveBeenCalledTimes(1);});
test('confirmation invokes the chosen action once',()=>{browser.confirm.mockReturnValue(true);Alert.alert('Sign out?','Data stays.',[{text:'Cancel',style:'cancel'},{text:'Sign out',onPress:confirmAction}]);expect(confirmAction).toHaveBeenCalledTimes(1);});
test('informational notices use a browser alert',()=>{Alert.alert('Saved','Preference could not be saved.');expect(browser.alert).toHaveBeenCalledWith('Saved\n\nPreference could not be saved.');expect(browser.confirm).not.toHaveBeenCalled();});
