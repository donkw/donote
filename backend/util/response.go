package util

import "fmt"

type Response struct {
	Code   int    `json:"code"`
	Msg    string `json:"msg"`
	ErrMsg string `json:"errMsg"`
	Data   any    `json:"data"`
}

func NewResponse() *Response {
	return &Response{
		Code: 1,
		Msg:  "success",
	}
}

func (r *Response) Success() *Response {
	r.Code = 1
	r.Msg = "success"
	return r
}
func (r *Response) Fail() *Response {
	r.Code = 0
	return r
}
func (r *Response) SuccessData(data any) *Response {
	r.Data = data
	return r.Success()
}
func (r *Response) FailMsg(format string, any ...any) *Response {
	r.ErrMsg = fmt.Sprintf(format, any...)
	return r.Fail()
}
